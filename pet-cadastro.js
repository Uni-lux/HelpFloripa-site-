// =====================================================
// Cadastro do pet (RG do pet) numa janela só, para usar no Social (17/11/2026, pedido dele: "fazer o cadastro aí
// nessa página") — o mesmo documento `pets/{id}` da página de alertas (mesmas regras, sem campo novo; `idade` já existia).
// Sem dependências do rede.js: quem chama passa o fb, o uid, a conta e o toast.
// =====================================================
import { ESPECIES, CORES_PET, rgPet, normalizarId, geohash } from "./alertas-base.js?v=1";
import { iconeEl, iconeEspecie } from "./icones-hf.js?v=2";

const COR_HEX = { preto: "#1b1b1b", branco: "#f5f5f0", marrom: "#6b4226", caramelo: "#c98a3c", cinza: "#8a8f96", dourado: "#d9a53b", creme: "#efe0bf", tigrado: "linear-gradient(135deg,#8a5a2b 0 30%,#2b1b10 30% 45%,#8a5a2b 45% 70%,#2b1b10 70%)", malhado: "radial-gradient(circle at 30% 30%,#222 0 22%,#f3f3f3 23%)", tricolor: "conic-gradient(#1b1b1b 0 33%,#c98a3c 0 66%,#f5f5f0 0)", laranja: "#e98a2b", rajado: "repeating-linear-gradient(45deg,#9a9a9a 0 4px,#4a4a4a 4px 8px)" };
const RACAS = {
  cao: ["SRD (vira-lata)", "Shih-tzu", "Poodle", "Yorkshire", "Spitz alemão", "Lhasa apso", "Golden retriever", "Labrador", "Pinscher", "Bulldog francês", "Pastor alemão", "Border collie", "Dachshund (salsicha)", "Pug", "Beagle", "Rottweiler", "Pit bull", "Maltês", "Chihuahua", "Husky siberiano"],
  gato: ["SRD (vira-lata)", "Siamês", "Persa", "Maine coon", "Angorá", "Sphynx", "British shorthair", "Ragdoll", "Bengal"],
  ave: ["Calopsita", "Periquito", "Papagaio", "Canário", "Agapornis"],
  outro: ["Coelho", "Hamster", "Porquinho-da-índia", "Tartaruga", "Furão"]
};
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const svg = (d) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.innerHTML = d; return s; };
const IC = { cortar: '<path d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"/>', lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', pata: '<circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-5 3-5 5 0 1.5 1.2 2.5 2.6 2.2 1-.2 1.6-.7 2.4-.7s1.4.5 2.4.7c1.4.3 2.6-.7 2.6-2.2 0-2-2-5-5-5z"/>', escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', paleta: '<path d="M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.6 0-1-.8-1.4-.8-2.4 0-1 .8-1.6 1.8-1.6H17a4 4 0 004-4c0-4.7-4-8.4-9-8.4z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7.5" r="1.2"/><circle cx="14.5" cy="7.5" r="1.2"/>', fechar: '<path d="M6 6l12 12M18 6L6 18"/>', camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>' };
export const fotoPetOk = (u) => (/^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/)/.test(String(u || "")) ? u : "");

let estilo = false;
function css() {
  if (estilo) return; estilo = true;
  const s = document.createElement("style");
  s.textContent = `
.pc-fundo{position:fixed;inset:0;z-index:5300;display:flex;align-items:flex-end;justify-content:center;background:var(--overlay,rgba(0,0,0,.6))}
.pc{width:min(480px,100%);max-height:94dvh;display:flex;flex-direction:column;background:var(--panel,#0f161b);color:var(--text,#fff);border-radius:22px 22px 0 0;overflow:hidden;animation:pcSobe .26s cubic-bezier(.2,.9,.2,1)}
@keyframes pcSobe{from{transform:translateY(40px);opacity:.5}}
@media (min-width:700px){.pc-fundo{align-items:center}.pc{border-radius:22px}}
.pc svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.pc-topo{display:flex;align-items:center;gap:10px;padding:12px 10px 12px 18px;border-bottom:1px solid var(--line,rgba(255,255,255,.1))}
.pc-topo h3{flex:1;margin:0;font-size:16px}
.pc-x{width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:none;color:inherit;cursor:pointer}
.pc-corpo{overflow-y:auto;overscroll-behavior:contain;padding:14px 16px 12px;display:grid;gap:14px}
.pc-cab{display:flex;align-items:center;gap:14px}
.pc-foto{position:relative;flex:none;width:84px;height:84px;border-radius:24px;overflow:hidden;display:grid;place-items:center;background:var(--panel-2,#182029);border:1.5px dashed var(--line,rgba(255,255,255,.18));cursor:pointer;color:var(--muted,#9aa7b4)}
.pc-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pc-foto.tem{border-style:solid}
.pc-foto .cam{position:absolute;right:4px;bottom:4px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--text,#fff);color:var(--panel,#0f161b)}
.pc-foto .cam svg{width:15px;height:15px}
.pc-foto input{position:absolute;inset:0;opacity:0;cursor:pointer}
.pc-cab .nm{flex:1;min-width:0;display:grid;gap:6px}
.pc-l{display:grid;gap:6px;font-size:12.5px;font-weight:750;color:var(--muted,#9aa7b4)}
.pc input[type=text],.pc textarea{width:100%;min-width:0;height:46px;padding:0 13px;border-radius:13px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);color:var(--text,#fff);font:inherit;font-size:15px;font-weight:500}
.pc textarea{height:auto;min-height:70px;padding:11px 13px;resize:vertical}
.pc-especies{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pc-esp{display:grid;justify-items:center;gap:6px;padding:12px 4px 10px;border-radius:15px;border:1.5px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);color:var(--text,#fff);font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.pc-esp[aria-pressed=true]{border-color:var(--accent,#00adee);background:color-mix(in srgb,var(--accent,#00adee) 12%,var(--panel-2,#182029))}
.pc-seg{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:4px;padding:4px;border-radius:13px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.1))}
.pc-seg button{min-height:38px;border:0;border-radius:10px;background:none;color:var(--muted,#9aa7b4);font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.pc-seg button[aria-pressed=true]{background:var(--panel,#0f161b);color:var(--text,#fff);box-shadow:0 1px 4px rgba(0,0,0,.25)}
.pc-duplo{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pc-cores{display:flex;flex-wrap:wrap;gap:7px}
.pc-cor{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 12px 0 6px;border-radius:99px;border:1.5px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);color:var(--text,#fff);font:inherit;font-size:12.5px;font-weight:650;cursor:pointer;text-transform:capitalize}
.pc-cor i{width:22px;height:22px;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(127,127,127,.4)}
.pc-cor[aria-pressed=true]{border-color:var(--text,#fff)}
.pc-sug{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-top:-2px}
.pc-sug::-webkit-scrollbar{display:none}
.pc-sug button{flex:none;height:30px;padding:0 11px;border-radius:99px;border:1px solid var(--line,rgba(255,255,255,.12));background:none;color:var(--muted,#9aa7b4);font:inherit;font-size:12px;cursor:pointer}
.pc-mais{border:0;background:none;color:var(--muted,#9aa7b4);font:inherit;font-size:13px;font-weight:700;text-align:left;padding:2px 0;cursor:pointer}
.pc-chave{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.1))}
.pc-chave .tx{flex:1;min-width:0;display:grid;gap:2px}
.pc-chave b{font-size:14px}
.pc-chave small{font-size:12px;color:var(--muted,#9aa7b4);line-height:1.35}
.pc-ch{position:relative;width:46px;height:28px;flex:none}
.pc-ch input{position:absolute;opacity:0;width:0;height:0}
.pc-ch span{position:absolute;inset:0;border-radius:99px;background:color-mix(in srgb,var(--muted,#9aa7b4) 45%,transparent);transition:background .2s}
.pc-ch span::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .2s}
.pc-ch input:checked + span{background:var(--accent,#00adee)}
.pc-ch input:checked + span::after{transform:translateX(18px)}
.pc-pe{padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(255,255,255,.1))}
.pc-salvar{width:100%;height:48px;border:0;border-radius:14px;background:var(--accent,#00adee);color:#001a24;font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.pc-salvar:disabled{opacity:.5}

/* 17/11/2026 (pedido dele): cadastro organizado em cartões, foto com recorte, sexo/porte e cores mais claros */
.pc-rg{display:flex;align-items:center;gap:14px;padding:14px;border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent,#00adee) 16%,var(--panel-2,#182029)),var(--panel-2,#182029));border:1px solid color-mix(in srgb,var(--accent,#00adee) 30%,transparent)}
.pc-rg .pc-foto{width:104px;height:104px;border-radius:26px}
.pc-rg .tx{flex:1;min-width:0;display:grid;gap:4px}
.pc-rg .sel{font-size:10.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--accent,#00adee)}
.pc-rg .nmv{font-size:18px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc-rg .sub{font-size:12.5px;color:var(--muted,#9aa7b4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc-fotobts{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.pc-fotobts button{height:30px;padding:0 11px;border-radius:99px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--panel,#0f161b);color:var(--text,#fff);font:inherit;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.pc-fotobts button svg{width:14px;height:14px}
.pc-barra{height:5px;border-radius:99px;background:color-mix(in srgb,var(--muted,#9aa7b4) 22%,transparent);overflow:hidden;margin-top:6px}
.pc-barra i{display:block;height:100%;width:var(--p,0%);background:var(--accent,#00adee);border-radius:inherit;transition:width .25s}
.pc-sec{display:grid;gap:12px;padding:14px;border-radius:18px;background:color-mix(in srgb,var(--panel-2,#182029) 55%,transparent);border:1px solid var(--line,rgba(255,255,255,.08))}
.pc-sec>h4{margin:0;display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:800;color:var(--text,#fff)}
.pc-sec>h4 small{margin-left:auto;font-size:11.5px;font-weight:700;color:var(--muted,#9aa7b4)}
.pc-sec>h4 svg{width:17px;height:17px;color:var(--accent,#00adee)}
.pc-opcoes{display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:8px}
.pc-op{position:relative;display:grid;justify-items:center;align-content:center;gap:3px;min-height:58px;padding:9px 6px;border-radius:14px;border:1.5px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);color:var(--text,#fff);font:inherit;cursor:pointer;text-align:center}
.pc-op b{font-size:13.5px;font-weight:800}
.pc-op small{font-size:11px;color:var(--muted,#9aa7b4);font-weight:600}
.pc-op .sx{font-size:18px;line-height:1;font-weight:800;color:var(--muted,#9aa7b4)}
.pc-op[aria-pressed=true]{border-color:var(--accent,#00adee);background:color-mix(in srgb,var(--accent,#00adee) 14%,var(--panel-2,#182029))}
.pc-op[aria-pressed=true] .sx{color:var(--accent,#00adee)}
.pc-op[aria-pressed=true]::after{content:"";position:absolute;top:6px;right:6px;width:16px;height:16px;border-radius:50%;background:var(--accent,#00adee) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12.5l4 4L18 8' fill='none' stroke='%23001a24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/12px no-repeat}
.pc-cores{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:8px}
.pc-cor{position:relative;display:grid;justify-items:center;gap:6px;height:auto;padding:10px 4px 8px;border-radius:14px;border:1.5px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);font-size:11.5px}
.pc-cor i{width:30px;height:30px}
.pc-cor[aria-pressed=true]{border-color:var(--accent,#00adee);background:color-mix(in srgb,var(--accent,#00adee) 12%,var(--panel-2,#182029))}
.pc-cor[aria-pressed=true]::after{content:"";position:absolute;top:5px;right:5px;width:15px;height:15px;border-radius:50%;background:var(--accent,#00adee) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12.5l4 4L18 8' fill='none' stroke='%23001a24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/11px no-repeat}
.pc-cor:disabled{opacity:.4}
.pc-dica{margin:-4px 0 0;font-size:12px;color:var(--muted,#9aa7b4);line-height:1.4}
html.pc-travado,html.pc-travado body{overflow:hidden!important}
`;
  document.head.appendChild(s);
}
function reduzirFoto(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image(), url = URL.createObjectURL(arquivo);
    img.onload = () => {
      let lado = 640, q = 0.8, r = "";
      for (let i = 0; i < 6; i++) {
        const k = Math.min(1, lado / Math.max(img.width, img.height));
        const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        r = cv.toDataURL("image/jpeg", q);
        if (r.length <= 250000) break;
        lado *= 0.8; q -= 0.08;
      }
      URL.revokeObjectURL(url); ok(r);
    };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error("foto")); };
    img.src = url;
  });
}

/**
 * Abre o cadastro (ou a edição) do RG do pet.
 * op: { fb, uid, dados (conta: nome, cidade, uf), pet (para editar), pos ({lat,lng} opcional), toast, aoSalvar(pet) }
 */
export function abrirCadastroPet(op) {
  css();
  const { fb, uid, toast } = op;
  const p = op.pet || null, v = p || {};
  const st = { especie: v.especie || "cao", cores: new Set(v.cores || []), porte: v.porte || "", sexo: v.sexo || "", foto: fotoPetOk(v.foto) };
  document.querySelectorAll(".pc-fundo").forEach((x) => x.remove());
  const fundo = el("div", "pc-fundo");
  const c = el("div", "pc"); c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true"); c.setAttribute("aria-label", p ? "Editar pet" : "Cadastrar pet");
  fundo.appendChild(c);
  document.documentElement.classList.add("pc-travado");
  const sair = () => { fundo.remove(); document.removeEventListener("keydown", tecla); if (!document.querySelector(".pc-fundo")) document.documentElement.classList.remove("pc-travado"); };
  const tecla = (e) => { if (e.key === "Escape") sair(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) sair(); });
  const topo = el("div", "pc-topo"); const x = el("button", "pc-x"); x.type = "button"; x.dataset.fechar = ""; x.setAttribute("aria-label", "Fechar"); x.appendChild(svg(IC.fechar)); x.addEventListener("click", sair);
  topo.append(el("h3", null, p ? `Editar ${p.nome || "pet"}` : "RG do pet"), x);
  const corpo = el("div", "pc-corpo");
  const titulo = (tx, ic, extra) => { const h = el("h4"); h.append(svg(IC[ic] || IC.pata), el("span", null, tx)); if (extra) h.appendChild(extra); return h; };
  const secao = (tx, ic, extra) => { const sc = el("section", "pc-sec"); sc.appendChild(titulo(tx, ic, extra)); corpo.appendChild(sc); return sc; };

  // 1) Cartão do RG: foto (com recorte), nome, o que já foi preenchido e quanto falta
  const rg = el("div", "pc-rg");
  const foto = el("label", "pc-foto"); foto.setAttribute("aria-label", "Foto do pet");
  const inp = el("input"); inp.type = "file"; inp.accept = "image/*"; inp.id = "pcFoto";
  const rgTx = el("div", "tx");
  const sel = el("span", "sel", p?.id ? rgPet(p.id) : "RG do pet · novo");
  const nmv = el("b", "nmv"); const sub = el("span", "sub");
  const barra = el("div", "pc-barra"); barra.appendChild(el("i"));
  const fbts = el("div", "pc-fotobts");
  const bAjustar = el("button"); bAjustar.type = "button"; bAjustar.append(svg(IC.cortar), document.createTextNode("Ajustar foto")); bAjustar.id = "pcAjustar";
  const bTirar = el("button"); bTirar.type = "button"; bTirar.append(svg(IC.lixo), document.createTextNode("Tirar"));
  fbts.append(bAjustar, bTirar);
  rgTx.append(sel, nmv, sub, barra, fbts);
  rg.append(foto, rgTx); corpo.appendChild(rg);
  let fotoOriginal = null; // o arquivo escolhido: "Ajustar foto" recorta de novo a partir dele
  const pintarFoto = () => {
    foto.replaceChildren();
    foto.classList.toggle("tem", !!st.foto);
    if (st.foto) { const i = el("img"); i.src = st.foto; i.alt = ""; foto.appendChild(i); }
    else { const [ic, cor] = iconeEspecie(st.especie); foto.appendChild(iconeEl(ic, { cor, tam: 38 })); }
    const cam = el("span", "cam"); cam.appendChild(svg(IC.camera)); foto.append(cam, inp);
    fbts.hidden = !st.foto; bAjustar.hidden = !fotoOriginal && !st.foto;
  };
  // Recorte quadrado (a foto aparece redonda/quadrada no RG, nos alertas e nos avisos): a pessoa enquadra o rosto do pet.
  async function recortar(arq) {
    try {
      const { editarImagem } = await import("./editor-imagem.js?v=7");
      const d = await editarImagem(arq, { titulo: "Foto do pet", dica: "Deixe o rosto do pet no meio do quadrado. Arraste e use dois dedos para aproximar.", proporcao: 1, larguraSaida: 720, qualidade: 0.82, limiteBytes: 240000 });
      if (d) { st.foto = d; pintarFoto(); pintarResumo(); }
    } catch { try { st.foto = await reduzirFoto(arq); pintarFoto(); pintarResumo(); } catch { toast?.("Não foi possível usar essa foto."); } }
  }
  inp.addEventListener("change", () => { const f = inp.files?.[0]; inp.value = ""; if (!f) return; fotoOriginal = f; recortar(f); });
  bAjustar.addEventListener("click", async () => {
    if (fotoOriginal) return recortar(fotoOriginal);
    try { const blob = await (await fetch(st.foto)).blob(); recortar(blob); } catch { inp.click(); }
  });
  bTirar.addEventListener("click", () => { st.foto = ""; fotoOriginal = null; pintarFoto(); pintarResumo(); });

  // 2) Identificação
  const sId = secao("Identificação", "pata");
  const nome = el("input"); nome.type = "text"; nome.id = "pcNome"; nome.maxLength = 40; nome.placeholder = "Nome do pet"; nome.value = v.nome || ""; nome.autocomplete = "off";
  const idade = el("input"); idade.type = "text"; idade.id = "pcIdade"; idade.maxLength = 20; idade.placeholder = "Idade (ex.: 3 anos)"; idade.value = v.idade || ""; idade.autocomplete = "off";
  const lNome = el("label", "pc-l"); lNome.append(el("span", null, "Nome"), nome);
  const lIdade = el("label", "pc-l"); lIdade.append(el("span", null, "Idade"), idade);
  const lEsp = el("div", "pc-l"); lEsp.appendChild(el("span", null, "Espécie"));
  const esp = el("div", "pc-especies");
  for (const [k, [n]] of Object.entries(ESPECIES)) {
    const b = el("button", "pc-esp"); b.type = "button"; b.dataset.especie = k; b.setAttribute("aria-pressed", String(st.especie === k));
    const [ic, cor] = iconeEspecie(k); b.append(iconeEl(ic, { cor, tam: 22, fundo: true }), el("span", null, n));
    b.addEventListener("click", () => { st.especie = k; esp.querySelectorAll("button").forEach((y) => y.setAttribute("aria-pressed", String(y === b))); if (!st.foto) pintarFoto(); pintarSug(); pintarResumo(); });
    esp.appendChild(b);
  }
  lEsp.appendChild(esp);
  sId.append(lNome, lIdade, lEsp);

  // 3) Características: sexo e porte em cartões claros (marcado = borda e fundo azul + ✓), raça e cores
  const sCar = secao("Características", "paleta");
  const opcoes = (rotulo, lista, atual, aoMudar, id) => {
    const l = el("div", "pc-l"); l.appendChild(el("span", null, rotulo));
    const g = el("div", "pc-opcoes"); g.style.setProperty("--n", String(lista.length)); g.id = id; g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo);
    lista.forEach(([k, n, sm, sx]) => {
      const b = el("button", "pc-op"); b.type = "button"; b.dataset.v = k; b.setAttribute("aria-pressed", String(k === atual));
      if (sx) b.appendChild(el("span", "sx", sx));
      b.appendChild(el("b", null, n)); if (sm) b.appendChild(el("small", null, sm));
      b.addEventListener("click", () => { const novo = b.getAttribute("aria-pressed") === "true" ? "" : k; aoMudar(novo); g.querySelectorAll("button").forEach((y) => y.setAttribute("aria-pressed", String(y.dataset.v === novo))); pintarResumo(); });
      g.appendChild(b);
    });
    l.appendChild(g); return l;
  };
  sCar.append(
    opcoes("Sexo", [["m", "Macho", "", "♂"], ["f", "Fêmea", "", "♀"]], st.sexo, (x) => (st.sexo = x), "pcSexo"),
    opcoes("Porte", [["P", "Pequeno", "até 10 kg"], ["M", "Médio", "10 a 25 kg"], ["G", "Grande", "mais de 25 kg"]], st.porte, (x) => (st.porte = x), "pcPorte"));
  const lRaca = el("label", "pc-l"); lRaca.appendChild(el("span", null, "Raça"));
  const raca = el("input"); raca.type = "text"; raca.id = "pcRaca"; raca.maxLength = 40; raca.placeholder = "Raça ou SRD (vira-lata)"; raca.value = v.raca || ""; raca.autocomplete = "off";
  raca.addEventListener("input", () => pintarResumo());
  const sug = el("div", "pc-sug");
  const pintarSug = () => { sug.replaceChildren(...(RACAS[st.especie] || []).map((r) => { const b = el("button", null, r); b.type = "button"; b.addEventListener("click", () => { raca.value = r; pintarResumo(); }); return b; })); };
  lRaca.append(raca, sug); sCar.appendChild(lRaca); pintarSug();
  const nCores = el("small");
  const lCor = el("div", "pc-l"); const tCor = el("span", null, "Cores da pelagem"); lCor.appendChild(tCor);
  const cores = el("div", "pc-cores"); cores.setAttribute("role", "group"); cores.setAttribute("aria-label", "Cores, até 4");
  const pintarCores = () => {
    nCores.textContent = `${st.cores.size} de 4`;
    cores.querySelectorAll(".pc-cor").forEach((b) => { const on = st.cores.has(b.dataset.cor); b.setAttribute("aria-pressed", String(on)); b.disabled = !on && st.cores.size >= 4; });
  };
  CORES_PET.forEach((cor) => {
    const b = el("button", "pc-cor"); b.type = "button"; b.dataset.cor = cor;
    const i = el("i"); i.style.setProperty("--c", COR_HEX[cor] || "#888"); b.append(i, el("span", null, cor));
    b.addEventListener("click", () => { if (st.cores.has(cor)) st.cores.delete(cor); else if (st.cores.size < 4) st.cores.add(cor); pintarCores(); pintarResumo(); });
    cores.appendChild(b);
  });
  const tituloCor = el("div", "pc-l"); tituloCor.style.cssText = "display:flex;justify-content:space-between;align-items:center"; tituloCor.append(tCor, nCores);
  lCor.replaceChildren(tituloCor, cores); sCar.appendChild(lCor); pintarCores();

  // 4) Segurança: o que ajuda a achar o pet se ele sumir
  const sSeg = secao("Para achar se ele sumir", "escudo");
  sSeg.appendChild(el("p", "pc-dica", "Quanto mais completo, mais fácil alguém reconhecer o seu pet pelos alertas da Help Floripa."));
  const lSin = el("label", "pc-l"); lSin.appendChild(el("span", null, "Sinais particulares"));
  const sinais = el("textarea"); sinais.id = "pcSinais"; sinais.maxLength = 300; sinais.placeholder = "Coleira, manchas, cicatriz, jeito de andar..."; sinais.value = v.sinais || "";
  sinais.addEventListener("input", () => pintarResumo());
  lSin.appendChild(sinais);
  const lChip = el("label", "pc-l"); lChip.appendChild(el("span", null, "Microchip (se tiver)"));
  const chip = el("input"); chip.type = "text"; chip.id = "pcChip"; chip.maxLength = 24; chip.inputMode = "numeric"; chip.placeholder = "Número do microchip"; chip.value = v.microchip || "";
  lChip.appendChild(chip);
  sSeg.append(lSin, lChip);
  const vis = el("label", "pc-chave"); const vtx = el("span", "tx"); vtx.append(el("b", null, "Aparecer nas buscas"), el("small", null, "Se ele sumir, quem encontrar um animal parecido acha você. Recomendado."));
  const vch = el("span", "pc-ch"); const vin = el("input"); vin.type = "checkbox"; vin.id = "pcVisivel"; vin.checked = p ? p.visivel !== false : true; vch.append(vin, el("span"));
  vis.append(vtx, vch); sSeg.appendChild(vis);

  // Resumo vivo no cartão do RG + quanto do cadastro está completo
  const pintarResumo = () => {
    nmv.textContent = nome.value.trim() || "Nome do pet";
    const partes = [ESPECIES[st.especie]?.[0], raca.value.trim(), { m: "macho", f: "fêmea" }[st.sexo], { P: "pequeno", M: "médio", G: "grande" }[st.porte]].filter(Boolean);
    sub.textContent = partes.join(" · ") || "Preencha os dados abaixo";
    const itens = [st.foto, nome.value.trim(), idade.value.trim(), st.sexo, st.porte, raca.value.trim(), st.cores.size, sinais.value.trim()];
    const pct = Math.round(itens.filter(Boolean).length / itens.length * 100);
    barra.style.setProperty("--p", pct + "%"); barra.firstChild.style.width = pct + "%"; barra.title = `Cadastro ${pct}% completo`;
  };
  nome.addEventListener("input", pintarResumo); idade.addEventListener("input", pintarResumo);
  pintarResumo();
  const pe = el("div", "pc-pe");
  const salvar = el("button", "pc-salvar", p ? "Salvar alterações" : "Criar o RG do pet"); salvar.type = "button"; salvar.id = "pcSalvar";
  const ok = () => { salvar.disabled = !nome.value.trim(); }; nome.addEventListener("input", ok); ok();
  salvar.addEventListener("click", async () => {
    if (!nome.value.trim()) { nome.focus(); return; }
    salvar.disabled = true; salvar.textContent = "Salvando...";
    const conta = op.dados || {};
    const doc = {
      nome: nome.value.trim().slice(0, 40), idade: idade.value.trim().slice(0, 20), especie: st.especie, cores: [...st.cores], porte: st.porte, sexo: st.sexo,
      raca: raca.value.trim().slice(0, 40), sinais: sinais.value.trim().slice(0, 300), microchip: normalizarId(chip.value).slice(0, 20),
      donoId: uid, donoNome: String(conta.nome || "").slice(0, 80), cidade: String(conta.cidade || "").slice(0, 60), uf: /^[A-Z]{2}$/.test(conta.uf || "") ? conta.uf : "",
      visivel: vin.checked, status: p?.status || "casa", geo4: p?.geo4 || (op.pos ? geohash(op.pos.lat, op.pos.lng, 4) : ""), atualizadoEm: fb.serverTimestamp()
    };
    if (st.foto) doc.foto = st.foto;
    if (!doc.idade) delete doc.idade;
    if (p?.perdidoEm) { doc.perdidoEm = p.perdidoEm; doc.perdidoLocal = p.perdidoLocal; }
    try {
      let id = p?.id;
      if (p) await fb.setDoc(fb.doc(fb.db, "pets", p.id), { ...doc, criadoEm: p.criadoEm || fb.serverTimestamp() });
      else id = (await fb.addDoc(fb.collection(fb.db, "pets"), { ...doc, criadoEm: fb.serverTimestamp() })).id;
      toast?.(p ? "Pet atualizado" : `RG criado: ${rgPet(id)}`);
      sair(); op.aoSalvar?.({ id, ...doc, criadoEm: p?.criadoEm || null });
    } catch (e) {
      salvar.disabled = false; salvar.textContent = p ? "Salvar alterações" : "Criar o RG do pet";
      toast?.(e?.code === "permission-denied" ? "O RG do pet ainda está sendo liberado." : "Não foi possível salvar.");
    }
  });
  pe.appendChild(salvar);
  pintarFoto();
  c.append(topo, corpo, pe);
  document.body.appendChild(fundo);
  setTimeout(() => { if (!p) nome.focus({ preventScroll: true }); }, 280);
  return { fechar: sair };
}
