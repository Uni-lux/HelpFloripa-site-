// =====================================================
// Comunidade (comunidade.html): doações, trocas, pedidos de ajuda, vagas em quarto compartilhado e achados e
// perdidos. Referências: Freecycle (oferta/pedido), Olio e grupos "Doa-se" (doação de graça, retirada combinada),
// OLX/Marketplace na categoria Doação e sites de "dividir apê" (vaga, divisão das contas, regras da casa).
// É PROIBIDO vender ou cobrar. As regras do Firestore recusam "R$" e "vendo/venda" no texto; quem insiste é
// banido do programa (programa_banidos/{uid}_comunidade) e pode ter a conta suspensa.
// Anúncio: comunidade/{id}. Link direto: comunidade.html?item=ID · ?novo=1 · ?meus=1
// =====================================================
import { confirmarHF } from "./confirmar.js?v=4";
import { temStorage, subirFoto } from "./armazenamento.js?v=1";
import { termosBusca, buscarNoServidor, combina } from "./busca.js?v=1";
import { fotoSegura, conferirEmail, emailPendente, mostrarAvisoEmail, MSG_EMAIL } from "./seguranca.js?v=1";
import { docComValidade } from "./leituras.js?v=1";
import { camposEndereco, textoCidade, semAcento } from "./endereco.js?v=1";
import { minhaPosicao, comDistancia, textoDistancia } from "./perto.js?v=2";
import { prepararConversa } from "./vitrine.js?v=55";

export const CATEGORIAS_COM = {
  doacao: { nome: "Doação", plural: "Doações", cor: "#e5487f", ic: "presente", acao: "Quero receber", dica: "Dê de graça o que você não usa mais" },
  troca: { nome: "Troca", plural: "Trocas", cor: "#8b5cf6", ic: "troca", acao: "Quero trocar", dica: "Troque uma coisa por outra, sem dinheiro" },
  pedido: { nome: "Preciso de", plural: "Pedidos de ajuda", cor: "#f59e0b", ic: "maos", acao: "Posso ajudar", dica: "Peça o que você está precisando" },
  quarto: { nome: "Quarto compartilhado", plural: "Quartos compartilhados", cor: "#0ea5e9", ic: "cama", acao: "Tenho interesse", dica: "Divida a moradia e as contas" },
  achados: { nome: "Achados e perdidos", plural: "Achados e perdidos", cor: "#10b981", ic: "lupa", acao: "Falar com quem postou", dica: "Perdeu ou encontrou alguma coisa?" }
};
export const TIPOS_ITEM = { moveis: "Móveis", eletro: "Eletrodomésticos", roupas: "Roupas e calçados", bebe: "Bebê e criança", livros: "Livros e escola", brinquedos: "Brinquedos", casa: "Casa e cozinha", eletronicos: "Eletrônicos", alimentos: "Alimentos (lacrados)", pets: "Pets e adoção", acessibilidade: "Saúde e acessibilidade", outros: "Outros" };
const ESTADOS = { novo: "Novo", seminovo: "Seminovo", usado: "Usado", reparo: "Precisa de reparo" };
const ENTREGA = { combinar: "A combinar", retirar: "Retirar no local", entrego: "Posso levar" };
const VAGAS = { individual: "Quarto individual", compartilhado: "Quarto compartilhado", republica: "Vaga em república" };
const PARA = { todos: "Qualquer pessoa", mulheres: "Só mulheres", homens: "Só homens", lgbt: "Pessoas LGBTQIA+" };
const STATUS = { disponivel: "Disponível", reservado: "Reservado", concluido: "Concluído" };
const VALIDADE_DIAS = 60; // depois disso o anúncio sai da lista até o dono renovar
// Palavras que indicam venda (as regras recusam as mesmas; aqui o aviso é antes, com explicação).
const VENDA = /\b(vendo|venda|vende|vender|vendem|vendas)\b/i;
const DINHEIRO = /r\s*\$/i;
export const REGRAS = [
  "É proibido vender ou cobrar qualquer valor, mesmo \"simbólico\" ou \"só o frete\".",
  "Quarto compartilhado: só a divisão das despesas entre moradores. Aluguel com lucro vai em Imóveis.",
  "Não é permitido: remédios, armas, animais silvestres, bebida alcoólica, cigarro, produtos ilegais e alimentos abertos ou vencidos.",
  "Adoção de animais é responsável e sem cobrança. Animal não é mercadoria.",
  "Quem descumpre tem o anúncio removido e pode ser banido da Comunidade e ter a conta suspensa ou banida."
];
const DICAS_SEGURANCA = ["Combine a entrega em lugar público e movimentado.", "Desconfie de quem pede \"taxa\", Pix ou frete adiantado: é golpe.", "Não passe documentos nem dados do cartão.", "Na dúvida, toque em Denunciar."];

let fb = null, eu = null, posEu = null, todos = [], banimento = null, meuPerfil = {};
const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : 0);
const moeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number(v) % 1 ? 2 : 0 });
const ICONES = {
  presente: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18v-1.5A1.5 1.5 0 0019.5 6h-15A1.5 1.5 0 003 7.5zM12 6v14M12 6c-1.5-3-5-3-5-.8C7 6 9.5 6 12 6zm0 0c1.5-3 5-3 5-.8C17 6 14.5 6 12 6z"/>',
  troca: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  maos: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
  cama: '<path d="M3 18v-7h18v7M3 14h18M6 11V8h5v3"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  chat: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  foto: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  escudo: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>',
  lapis: '<path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4z"/>',
  lixo: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  relogio: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.8"/>',
  verificado: '<path d="M12 2.8l2.3 1.7 2.9.1.9 2.8 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-.9 2.8-2.9.1L12 21.2l-2.3-1.7-2.9-.1-.9-2.8-2.3-1.8.9-2.8-.9-2.8 2.3-1.8.9-2.8 2.9-.1z"/><path d="M8.6 12.2l2.3 2.3 4.6-4.8"/>',
  compartilhar: '<path d="M12 15V4M8 8l4-4 4 4M5 12v6.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V12"/>'
};
function icone(nome, cls = "ci") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", cls); s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONES[nome] || "";
  return s;
}
function toast(t) {
  document.querySelectorAll(".cm-toast").forEach((x) => x.remove());
  const d = el("div", "cm-toast", t); d.setAttribute("role", "status");
  document.body.appendChild(d); setTimeout(() => d.remove(), 4200);
}
function avatar(foto, nome) {
  const a = el("span", "cm-av");
  const f = fotoSegura(foto);
  if (f) { const i = document.createElement("img"); i.src = f; i.alt = ""; i.loading = "lazy"; a.appendChild(i); }
  else a.textContent = String(nome || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return a;
}
function ha(t) {
  const d = Math.max(0, Date.now() - ms(t));
  if (d < 3600e3) return `há ${Math.max(1, Math.round(d / 60000))} min`;
  if (d < 864e5) return `há ${Math.round(d / 3600e3)} h`;
  const dias = Math.round(d / 864e5);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}
const dataBR = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.split("-").reverse().join("/") : "");
const vencido = (a) => Date.now() - ms(a.atualizadoEm || a.criadoEm) > VALIDADE_DIAS * 864e5;
const oculto = (a) => ms(a.ocultoAte) > Date.now();
const donos = new Map();

// ---------- lista ----------
let filtroCat = "todos", filtroItem = "", ordem = "recentes";
function passa(a) {
  if (a.status === "concluido" || oculto(a) || vencido(a)) return false;
  if (filtroCat !== "todos" && a.categoria !== filtroCat) return false;
  if (filtroItem && a.tipoItem !== filtroItem) return false;
  const t = ($("cmBusca")?.value || "").trim();
  if (t && !combina(t, [a.titulo, a.descricao, a.bairro, a.cidade, TIPOS_ITEM[a.tipoItem], CATEGORIAS_COM[a.categoria]?.nome].join(" "))) return false;
  return true;
}
function cartao(a) {
  const C = CATEGORIAS_COM[a.categoria] || CATEGORIAS_COM.doacao;
  const c = el("article", "cm-card"); c.style.setProperty("--cc", C.cor);
  c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", `Ver ${a.titulo}`);
  const ft = el("div", "cm-ft");
  const foto = fotoSegura((a.fotos || [])[0]);
  if (foto) ft.style.backgroundImage = `url("${foto}")`;
  else { ft.classList.add("sem"); ft.appendChild(icone(C.ic, "ci g")); }
  const tag = el("span", "cm-tag"); tag.append(icone(C.ic), document.createTextNode(a.categoria === "achados" ? (a.achado?.tipo === "perdido" ? "Perdido" : "Encontrado") : C.nome));
  ft.appendChild(tag);
  if (a.status === "reservado") ft.appendChild(el("span", "cm-res", "Reservado"));
  if ((a.fotos || []).length > 1) ft.appendChild(el("span", "cm-nfotos", `1/${a.fotos.length}`));
  const tx = el("div", "cm-tx");
  tx.appendChild(el("strong", null, a.titulo));
  const sub = [];
  if (a.categoria === "quarto") sub.push(VAGAS[a.quarto?.vaga] || "Vaga", Number(a.quarto?.rateio) > 0 ? `divisão ${moeda(a.quarto.rateio)}/mês` : "");
  else if (a.tipoItem && TIPOS_ITEM[a.tipoItem]) sub.push(TIPOS_ITEM[a.tipoItem]);
  tx.appendChild(el("small", null, sub.filter(Boolean).join(" · ") || C.dica));
  const pe = el("small", "cm-onde");
  pe.append(icone("pin"), document.createTextNode([Number.isFinite(a._km) && posEu ? textoDistancia(a._km, a._aprox) : "", a.bairro || textoCidade(a)].filter(Boolean).join(" · ") || "Local a combinar"));
  tx.append(pe, el("small", "cm-quando", ha(a.atualizadoEm || a.criadoEm)));
  c.append(ft, tx);
  const abrir = () => abrirItem(a);
  c.addEventListener("click", abrir);
  c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
  return c;
}
function pintar() {
  const grade = $("cmGrade"), info = $("cmInfo");
  if (!grade) return;
  let lista = todos.filter(passa);
  if (ordem === "perto") lista = [...lista].sort((a, b) => (a._km ?? Infinity) - (b._km ?? Infinity));
  else lista = [...lista].sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm));
  info.textContent = lista.length ? `${lista.length} ${lista.length === 1 ? "anúncio" : "anúncios"}` : "";
  grade.replaceChildren(...(lista.length ? lista.map(cartao) : [vazio()]));
}
function vazio() {
  const v = el("div", "cm-vazio");
  v.append(icone(CATEGORIAS_COM[filtroCat]?.ic || "presente", "ci g"), el("strong", null, todos.length ? "Nada por aqui com esse filtro" : "Ainda não tem anúncios na Comunidade"),
    el("p", null, filtroCat === "pedido" ? "Precisa de alguma coisa? Faça um pedido: alguém perto pode ter sobrando." : "Seja a primeira pessoa a doar, trocar ou oferecer uma vaga."));
  const b = el("button", "cm-btn pri", "Anunciar na Comunidade"); b.type = "button";
  b.addEventListener("click", () => abrirForm(null, filtroCat !== "todos" ? filtroCat : "doacao"));
  v.appendChild(b);
  return v;
}

// ---------- detalhe ----------
function janela(titulo, cor) {
  const fundo = el("div", "cm-modal"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", titulo);
  if (cor) fundo.style.setProperty("--cc", cor);
  const cx = el("div", "cm-caixa");
  const x = el("button", "cm-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.dataset.fechar = ""; x.appendChild(icone("fechar"));
  cx.appendChild(x); fundo.appendChild(cx); document.body.appendChild(fundo);
  const sair = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") sair(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) sair(); });
  x.addEventListener("click", sair);
  requestAnimationFrame(() => x.focus());
  return { cx, sair };
}
function fato(rot, val, ic) {
  if (!val) return null;
  const d = el("div", "cm-fato");
  d.append(icone(ic || "check"), el("span", null, rot), el("strong", null, val));
  return d;
}
async function abrirItem(a) {
  const C = CATEGORIAS_COM[a.categoria] || CATEGORIAS_COM.doacao;
  const { cx, sair } = janela(a.titulo, C.cor);
  const proprio = !!eu && a.donoId === eu.uid;
  const fotos = (a.fotos || []).map(fotoSegura).filter(Boolean);
  if (fotos.length) {
    const g = el("div", "cm-galeria");
    fotos.forEach((f, i) => { const im = document.createElement("img"); im.src = f; im.alt = `Foto ${i + 1} de ${fotos.length}`; im.loading = "lazy"; g.appendChild(im); });
    cx.appendChild(g);
  } else { const s = el("div", "cm-galeria sem"); s.appendChild(icone(C.ic, "ci g")); cx.appendChild(s); }
  const ct = el("div", "cm-conteudo");
  const tag = el("span", "cm-tag in"); tag.append(icone(C.ic), document.createTextNode(a.categoria === "achados" ? (a.achado?.tipo === "perdido" ? "Perdido" : "Encontrado") : C.nome));
  const tit = el("h2", null, a.titulo);
  ct.append(tag, tit);
  const meta = el("p", "cm-meta", [a.bairro, textoCidade(a)].filter(Boolean).join(", ") + ` · ${ha(a.atualizadoEm || a.criadoEm)}` + (a.status === "reservado" ? " · Reservado" : ""));
  ct.appendChild(meta);
  const fatos = el("div", "cm-fatos");
  if (a.categoria === "quarto") {
    const q = a.quarto || {};
    [fato("Vaga", VAGAS[q.vaga], "cama"), fato("Divisão das despesas", Number(q.rateio) > 0 ? `${moeda(q.rateio)} por mês${q.contasInclusas ? " (com contas)" : ""}` : "A combinar", "relogio"),
      fato("Mobiliado", q.mobiliado ? "Sim" : "Não", "check"), fato("Vagas", q.vagas ? String(q.vagas) : "", "check"), fato("Para", PARA[q.para] || "", "check"),
      fato("Disponível em", dataBR(q.disponivelEm), "relogio")].forEach((f) => f && fatos.appendChild(f));
  } else if (a.categoria === "achados") {
    const x = a.achado || {};
    [fato(x.tipo === "perdido" ? "Perdido em" : "Encontrado em", x.local, "pin"), fato("Quando", dataBR(x.data), "relogio")].forEach((f) => f && fatos.appendChild(f));
  } else {
    [fato("Tipo", TIPOS_ITEM[a.tipoItem], "presente"), fato("Estado", a.categoria === "pedido" ? "" : ESTADOS[a.estado], "check"), fato("Entrega", ENTREGA[a.entrega], "pin")].forEach((f) => f && fatos.appendChild(f));
  }
  if (fatos.children.length) ct.appendChild(fatos);
  if (a.descricao) ct.appendChild(el("p", "cm-desc", a.descricao));
  if (a.categoria === "quarto" && a.quarto?.regras) { ct.appendChild(el("h4", null, "Regras da casa")); ct.appendChild(el("p", "cm-desc", a.quarto.regras)); }
  // Quem anunciou
  const dono = donos.get(a.donoId) || (await docComValidade(fb, ["perfis_publicos", a.donoId], 30 * 60000).then((s) => (s.exists() ? s.data() : {})).catch(() => ({})));
  donos.set(a.donoId, dono);
  const quem = el("a", "cm-quem"); quem.href = `usuarios.html?uid=${encodeURIComponent(a.donoId)}`;
  const qt = el("span", "tx"); const nm = el("strong", null, dono.nome || "Pessoa da comunidade");
  if (dono.verificado) nm.appendChild(icone("verificado", "ci ok"));
  qt.append(nm, el("small", null, [dono.cidade, "Ver perfil"].filter(Boolean).join(" · ")));
  quem.append(avatar(dono.fotoPerfil || dono.foto, dono.nome), qt);
  ct.appendChild(quem);
  // Segurança e a regra da casa
  const seg = el("div", "cm-seg");
  seg.append(el("strong", null, "Para trocar com segurança"));
  const ul = el("ul"); DICAS_SEGURANCA.forEach((t) => ul.appendChild(el("li", null, t))); seg.appendChild(ul);
  ct.appendChild(seg);
  const acoes = el("div", "cm-acoes");
  if (proprio) {
    const ed = el("button", "cm-btn"); ed.type = "button"; ed.append(icone("lapis"), document.createTextNode("Editar"));
    ed.addEventListener("click", () => { sair(); abrirForm(a); });
    const st = el("button", "cm-btn"); st.type = "button";
    const prox = a.status === "disponivel" ? "reservado" : "disponivel";
    st.append(icone("relogio"), document.createTextNode(a.status === "disponivel" ? "Marcar como reservado" : "Disponível de novo"));
    st.addEventListener("click", () => mudarStatus(a, prox, sair));
    const fim = el("button", "cm-btn pri"); fim.type = "button";
    fim.append(icone("check"), document.createTextNode({ doacao: "Já doei", troca: "Já troquei", pedido: "Já recebi ajuda", quarto: "Vaga preenchida", achados: "Resolvido" }[a.categoria] || "Concluído"));
    fim.addEventListener("click", () => mudarStatus(a, "concluido", sair));
    acoes.append(ed, st, fim);
    if (vencido(a)) { const rn = el("button", "cm-btn"); rn.type = "button"; rn.append(icone("relogio"), document.createTextNode("Renovar por mais 60 dias")); rn.addEventListener("click", () => mudarStatus(a, a.status, sair)); acoes.appendChild(rn); }
    const ex = el("button", "cm-btn perigo"); ex.type = "button"; ex.append(icone("lixo"), document.createTextNode("Excluir"));
    ex.addEventListener("click", async () => {
      if (!(await confirmarHF({ titulo: "Excluir este anúncio?", texto: "Ele sai da Comunidade e não dá para desfazer.", ok: "Excluir", icone: "lixo" }))) return;
      try { await fb.deleteDoc(fb.doc(fb.db, "comunidade", a.id)); todos = todos.filter((x) => x.id !== a.id); sair(); pintar(); pintarMeus(); toast("Anúncio excluído"); }
      catch { toast("Não foi possível excluir agora."); }
    });
    acoes.appendChild(ex);
  } else {
    const ok = el("button", "cm-btn pri grande"); ok.type = "button";
    ok.append(icone("chat"), document.createTextNode(C.acao));
    ok.disabled = a.status === "reservado";
    if (a.status === "reservado") ok.lastChild.textContent = "Reservado para outra pessoa";
    ok.addEventListener("click", () => {
      if (!eu) { location.href = "login.html"; return; }
      if (emailPendente(eu)) { mostrarAvisoEmail(eu); toast(MSG_EMAIL); return; }
      const foto = (a.fotos || []).map(fotoSegura).find((f) => f && f.length < 220000) || "";
      sair();
      prepararConversa(fb, eu, a.donoId, { tipo: "comunidade", titulo: a.titulo, sub: [C.nome, a.bairro || textoCidade(a)].filter(Boolean).join(" · "), preco: a.categoria === "quarto" && Number(a.quarto?.rateio) > 0 ? `divisão ${moeda(a.quarto.rateio)}/mês` : a.categoria === "doacao" ? "De graça" : "", foto, link: `comunidade.html?item=${encodeURIComponent(a.id)}` });
    });
    acoes.appendChild(ok);
    const den = el("button", "cm-denunciar"); den.type = "button";
    den.append(icone("alerta"), document.createTextNode("Denunciar venda, golpe ou anúncio proibido"));
    den.addEventListener("click", async () => {
      if (!eu) { location.href = "login.html"; return; }
      const { abrirDenuncia } = await import("./denuncias.js?v=5");
      abrirDenuncia({ fb, eu, tipo: "comunidade", alvoId: a.donoId, itemId: a.id, trecho: [a.titulo, a.descricao].filter(Boolean).join(" · "), nomeAlvo: a.titulo, podeBloquear: false });
    });
    acoes.appendChild(den);
  }
  const comp = el("button", "cm-link"); comp.type = "button"; comp.append(icone("compartilhar"), document.createTextNode("Compartilhar"));
  comp.addEventListener("click", async () => {
    const url = new URL(`comunidade.html?item=${encodeURIComponent(a.id)}`, location.href).href;
    try { if (navigator.share) await navigator.share({ title: a.titulo, text: `${C.nome}: ${a.titulo} na Comunidade do Help Floripa`, url }); else { await navigator.clipboard.writeText(url); toast("Link copiado"); } }
    catch (e) { if (e?.name !== "AbortError") toast("Não foi possível compartilhar agora."); }
  });
  acoes.appendChild(comp);
  ct.appendChild(acoes);
  cx.appendChild(ct);
}
async function mudarStatus(a, status, sair) {
  try {
    await fb.updateDoc(fb.doc(fb.db, "comunidade", a.id), { status, atualizadoEm: fb.serverTimestamp() });
    Object.assign(a, { status, atualizadoEm: { toMillis: () => Date.now() } });
    sair(); pintar(); pintarMeus();
    toast(status === "concluido" ? "Que bom! O anúncio saiu da lista." : status === "reservado" ? "Marcado como reservado" : "Anúncio atualizado");
  } catch { toast("Não foi possível atualizar agora."); }
}

// ---------- meus anúncios ----------
function pintarMeus() {
  const box = $("cmMeus");
  if (!box || !eu) return;
  const meus = todos.filter((a) => a.donoId === eu.uid).sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm));
  $("cmMeusN").textContent = meus.length ? String(meus.length) : "";
  box.replaceChildren();
  if (!meus.length) { box.appendChild(el("p", "cm-sub", "Você ainda não anunciou na Comunidade.")); return; }
  meus.forEach((a) => {
    const C = CATEGORIAS_COM[a.categoria] || CATEGORIAS_COM.doacao;
    const l = el("button", "cm-meu"); l.type = "button"; l.style.setProperty("--cc", C.cor);
    const ft = el("span", "ft"); const f = fotoSegura((a.fotos || [])[0]); if (f) ft.style.backgroundImage = `url("${f}")`; else ft.appendChild(icone(C.ic));
    const tx = el("span", "tx"); tx.append(el("strong", null, a.titulo), el("small", null, `${C.nome} · ${oculto(a) ? "Escondido pela equipe" : vencido(a) && a.status !== "concluido" ? "Vencido: renove" : STATUS[a.status] || ""} · ${ha(a.atualizadoEm || a.criadoEm)}`));
    l.append(ft, tx);
    l.addEventListener("click", () => abrirItem(a));
    box.appendChild(l);
  });
}

// ---------- formulário ----------
async function reduzirFoto(arquivo) {
  const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = URL.createObjectURL(arquivo); });
  let lado = 1080, q = 0.72, dados = "";
  for (let i = 0; i < 6; i++) {
    const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    dados = c.toDataURL("image/jpeg", q);
    if (dados.length <= 190000) break;
    lado = Math.round(lado * 0.82); q = Math.max(0.5, q - 0.06);
  }
  URL.revokeObjectURL(img.src);
  return dados;
}
function abrirForm(a = null, catInicial = "doacao") {
  if (!eu) { location.href = "login.html"; return; }
  if (banimento) { avisoBanido(); return; }
  if (emailPendente(eu)) { mostrarAvisoEmail(eu); toast(MSG_EMAIL); return; }
  const d = a ? JSON.parse(JSON.stringify({ ...a, criadoEm: null, atualizadoEm: null })) : { categoria: catInicial, tipoItem: "", estado: "usado", entrega: "combinar", fotos: [], quarto: { vaga: "compartilhado", para: "todos", contasInclusas: false, mobiliado: true, vagas: 1 }, achado: { tipo: "perdido" } };
  if (!d.quarto) d.quarto = { vaga: "compartilhado", para: "todos", contasInclusas: false, mobiliado: true, vagas: 1 };
  if (!d.achado) d.achado = { tipo: "perdido" };
  const { cx, sair } = janela(a ? "Editar anúncio" : "Anunciar na Comunidade", CATEGORIAS_COM[d.categoria]?.cor);
  cx.classList.add("form");
  const f = el("form", "cm-form"); f.noValidate = true;
  cx.appendChild(f);
  const cab = el("div", "cm-form-cab");
  cab.append(el("h2", null, a ? "Editar anúncio" : "Anunciar na Comunidade"), el("p", null, "Doar, trocar, pedir ajuda, dividir moradia ou devolver o que foi perdido. Sem dinheiro no meio."));
  f.appendChild(cab);
  const regra = el("div", "cm-regra");
  regra.append(icone("alerta"), el("span", null, "É proibido vender ou cobrar nesta área. Anúncio com venda é removido e quem insistir é banido da Comunidade e pode ter a conta suspensa ou banida."));
  f.appendChild(regra);
  // Tipo do anúncio
  const cats = el("div", "cm-cats"); cats.setAttribute("role", "radiogroup"); cats.setAttribute("aria-label", "Tipo do anúncio");
  Object.entries(CATEGORIAS_COM).forEach(([k, C]) => {
    const b = el("button", "cm-cat"); b.type = "button"; b.dataset.cat = k; b.style.setProperty("--cc", C.cor); b.setAttribute("role", "radio");
    b.disabled = !!a && a.categoria !== k;
    b.append(icone(C.ic), el("strong", null, C.nome), el("small", null, C.dica));
    b.addEventListener("click", () => { d.categoria = k; pintarCampos(); });
    cats.appendChild(b);
  });
  f.appendChild(cats);
  const campos = el("div", "cm-campos");
  f.appendChild(campos);
  const campo = (rot, input, ajuda) => { const c = el("label", "cm-campo"); c.append(el("span", null, rot), input); if (ajuda) c.appendChild(el("small", null, ajuda)); return c; };
  const sel = (ops, valor, mudar) => { const s = document.createElement("select"); Object.entries(ops).forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; s.appendChild(o); }); s.value = valor; s.addEventListener("change", () => mudar(s.value)); return s; };
  const inp = (valor, mudar, { max = 80, ph = "", tipo = "text", modo } = {}) => { const i = document.createElement("input"); i.type = tipo; i.maxLength = max; i.placeholder = ph; i.value = valor ?? ""; if (modo) i.inputMode = modo; i.addEventListener("input", () => mudar(i.value)); return i; };
  // Fotos (até 4)
  const fotosBox = el("div", "cm-fotos");
  const arq = document.createElement("input"); arq.type = "file"; arq.accept = "image/*"; arq.multiple = true; arq.hidden = true; arq.id = "cmArquivo";
  const pintarFotos = () => {
    fotosBox.replaceChildren();
    d.fotos.forEach((src, i) => {
      const p = el("div", "cm-foto"); p.style.backgroundImage = `url("${src}")`;
      const x = el("button", "x"); x.type = "button"; x.setAttribute("aria-label", "Tirar a foto"); x.appendChild(icone("fechar"));
      x.addEventListener("click", () => { d.fotos.splice(i, 1); pintarFotos(); });
      p.appendChild(x); fotosBox.appendChild(p);
    });
    if (d.fotos.length < 4) { const add = el("button", "cm-foto add"); add.type = "button"; add.setAttribute("aria-label", "Adicionar foto"); add.append(icone("foto"), el("small", null, "Foto")); add.addEventListener("click", () => arq.click()); fotosBox.appendChild(add); }
  };
  arq.addEventListener("change", async () => {
    const lista = [...(arq.files || [])].slice(0, 4 - d.fotos.length); arq.value = "";
    for (const x of lista) { try { d.fotos.push(await reduzirFoto(x)); } catch { toast("Não foi possível usar uma das fotos."); } }
    pintarFotos();
  });
  let local = null;
  function pintarCampos() {
    cats.querySelectorAll(".cm-cat").forEach((b) => { const on = b.dataset.cat === d.categoria; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    cx.parentNode.style.setProperty("--cc", CATEGORIAS_COM[d.categoria].cor);
    campos.replaceChildren();
    const k = d.categoria;
    const ph = { doacao: "Ex.: Sofá de 3 lugares", troca: "Ex.: Troco bicicleta aro 26 por patinete", pedido: "Ex.: Preciso de um berço", quarto: "Ex.: Vaga em quarto no Pantanal, perto da UFSC", achados: "Ex.: Carteira marrom perdida no TICEN" }[k];
    campos.appendChild(campo("Título", inp(d.titulo, (v) => { d.titulo = v; }, { max: 80, ph })));
    if (k === "doacao" || k === "troca" || k === "pedido") {
      campos.appendChild(campo("O que é", sel({ "": "Escolha", ...TIPOS_ITEM }, d.tipoItem || "", (v) => { d.tipoItem = v; })));
      if (k !== "pedido") {
        const g = el("div", "cm-duas");
        g.append(campo("Estado", sel(ESTADOS, d.estado || "usado", (v) => { d.estado = v; })), campo("Entrega", sel(ENTREGA, d.entrega || "combinar", (v) => { d.entrega = v; })));
        campos.appendChild(g);
      }
    }
    if (k === "quarto") {
      const q = d.quarto;
      const g = el("div", "cm-duas");
      g.append(campo("Tipo de vaga", sel(VAGAS, q.vaga || "compartilhado", (v) => { q.vaga = v; })), campo("Para", sel(PARA, q.para || "todos", (v) => { q.para = v; })));
      campos.appendChild(g);
      const g2 = el("div", "cm-duas");
      g2.append(campo("Divisão das despesas (R$/mês)", inp(q.rateio ? String(q.rateio).replace(".", ",") : "", (v) => { const n = Number(String(v).replace(/[^\d,]/g, "").replace(",", ".")); q.rateio = n > 0 ? Math.min(n, 5000) : null; }, { max: 8, ph: "Ex.: 600", modo: "decimal" }), "Só a sua parte do aluguel e das contas, sem lucro."),
        campo("Quantas vagas", inp(q.vagas || 1, (v) => { const n = parseInt(v, 10); q.vagas = n >= 1 ? Math.min(n, 10) : 1; }, { max: 2, tipo: "number", modo: "numeric" })));
      campos.appendChild(g2);
      const g3 = el("div", "cm-duas");
      const disp = inp(q.disponivelEm || "", (v) => { q.disponivelEm = v; }, { tipo: "date" }); disp.dataset.titulo = "Disponível a partir de";
      g3.append(campo("Disponível a partir de", disp));
      const marcas = el("div", "cm-marcas");
      [["contasInclusas", "Contas inclusas"], ["mobiliado", "Mobiliado"]].forEach(([c, t]) => { const l = el("label", "cm-marca"); const x = document.createElement("input"); x.type = "checkbox"; x.checked = !!q[c]; x.addEventListener("change", () => { q[c] = x.checked; }); l.append(x, document.createTextNode(t)); marcas.appendChild(l); });
      g3.appendChild(marcas);
      campos.appendChild(g3);
      const reg = document.createElement("textarea"); reg.maxLength = 300; reg.placeholder = "Ex.: não fumantes, sem festas, divisão da limpeza..."; reg.value = q.regras || ""; reg.addEventListener("input", () => { q.regras = reg.value; });
      campos.appendChild(campo("Regras da casa (opcional)", reg));
      campos.appendChild(el("p", "cm-nota", "Aluguel de imóvel inteiro, por imobiliária ou com lucro não entra aqui: anuncie em Imóveis."));
    }
    if (k === "achados") {
      const x = d.achado;
      const g = el("div", "cm-duas");
      const data = inp(x.data || "", (v) => { x.data = v; }, { tipo: "date" }); data.dataset.titulo = "Quando?";
      g.append(campo("Você", sel({ perdido: "Perdi", encontrado: "Encontrei" }, x.tipo || "perdido", (v) => { x.tipo = v; })), campo("Quando", data));
      campos.appendChild(g);
      campos.appendChild(campo("Onde", inp(x.local, (v) => { x.local = v; }, { max: 80, ph: "Ex.: ônibus 133, Terminal Centro (TICEN)" })));
      campos.appendChild(el("p", "cm-nota", "Encontrou documento ou cartão? Não poste a foto do documento: descreva por cima e combine a devolução pelo chat."));
    }
    const desc = document.createElement("textarea"); desc.maxLength = 1000; desc.value = d.descricao || "";
    desc.placeholder = { doacao: "Conte como está, medidas, por que está doando e como combinar a retirada.", troca: "O que você oferece e o que aceita em troca.", pedido: "Conte o que precisa e para quem. Quem puder ajudar te chama no chat.", quarto: "Como é a casa, quem mora, o bairro e o que tem perto.", achados: "Descreva o objeto (cor, marca, detalhes) sem mostrar documentos." }[k];
    desc.addEventListener("input", () => { d.descricao = desc.value; });
    campos.appendChild(campo("Descrição", desc));
    if (k !== "pedido") { campos.appendChild(el("span", "cm-rot", k === "achados" ? "Fotos (sem documentos)" : "Fotos (até 4)")); campos.appendChild(fotosBox); pintarFotos(); }
    const loc = el("div", "cm-local"); campos.appendChild(el("span", "cm-rot", "Onde"));
    campos.appendChild(loc);
    local = camposEndereco(loc, { campos: ["uf", "cidade", "bairro"], obrigatorios: ["uf", "cidade"], valor: { uf: d.uf || meuPerfil.uf, cidade: d.cidade || meuPerfil.cidade, cidadeIbge: d.cidadeIbge || meuPerfil.cidadeIbge, bairro: d.bairro || "" } });
  }
  pintarCampos();
  f.appendChild(arq);
  const aceite = el("label", "cm-aceite");
  const ac = document.createElement("input"); ac.type = "checkbox"; ac.id = "cmAceite"; ac.checked = !!a;
  aceite.append(ac, el("span", null, "Li as regras: não vou vender nem cobrar, e sei que posso ser banido(a) da Comunidade se descumprir."));
  f.appendChild(aceite);
  const ver = el("button", "cm-link"); ver.type = "button"; ver.textContent = "Ver as regras da Comunidade";
  ver.addEventListener("click", mostrarRegras);
  f.appendChild(ver);
  const env = el("button", "cm-btn pri grande"); env.type = "submit"; env.textContent = a ? "Salvar" : "Publicar";
  f.appendChild(env);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const k = d.categoria;
    const titulo = String(d.titulo || "").replace(/\s+/g, " ").trim();
    const descricao = String(d.descricao || "").trim();
    if (titulo.length < 3) { toast("Dê um título ao anúncio."); return; }
    if ((k === "doacao" || k === "troca" || k === "pedido") && !d.tipoItem) { toast("Escolha o que é."); return; }
    const texto = `${titulo} ${descricao} ${d.quarto?.regras || ""}`;
    if (VENDA.test(texto) || (k !== "quarto" && DINHEIRO.test(texto))) { toast("Aqui não pode vender nem falar de preço. Tire \"venda\", \"vendo\" ou \"R$\" do texto (para vender, use o Shopping)."); return; }
    if (k === "achados" && !String(d.achado.local || "").trim()) { toast("Diga onde perdeu ou encontrou."); return; }
    if (k === "quarto" && d.quarto.disponivelEm && !/^\d{4}-\d{2}-\d{2}$/.test(d.quarto.disponivelEm)) { toast("Confira a data."); return; }
    const erroLocal = local?.validar(); if (erroLocal) { toast(erroLocal); return; }
    if (!ac.checked) { toast("Confirme que leu as regras da Comunidade."); ac.focus(); return; }
    env.disabled = true; env.textContent = "Publicando...";
    try {
      const lo = local.ler();
      const dados = {
        donoId: eu.uid, categoria: k, titulo: titulo.slice(0, 80), descricao: descricao.slice(0, 1000),
        fotos: k === "pedido" ? [] : d.fotos.slice(0, 4), status: a?.status || "disponivel",
        uf: lo.uf, cidade: lo.cidade, cidadeIbge: lo.cidadeIbge, bairro: String(lo.bairro || "").slice(0, 60),
        aceiteRegras: true, atualizadoEm: fb.serverTimestamp()
      };
      if (k === "doacao" || k === "troca" || k === "pedido") Object.assign(dados, { tipoItem: d.tipoItem, ...(k !== "pedido" ? { estado: d.estado || "usado", entrega: d.entrega || "combinar" } : {}) });
      if (k === "quarto") {
        const q = d.quarto;
        dados.quarto = { vaga: q.vaga || "compartilhado", rateio: Number(q.rateio) > 0 ? Math.round(Number(q.rateio) * 100) / 100 : null, contasInclusas: !!q.contasInclusas, mobiliado: !!q.mobiliado, vagas: Number.isInteger(q.vagas) ? q.vagas : 1, para: PARA[q.para] ? q.para : "todos", disponivelEm: /^\d{4}-\d{2}-\d{2}$/.test(q.disponivelEm || "") ? q.disponivelEm : "", regras: String(q.regras || "").replace(/[\n\r]+/g, " ").trim().slice(0, 300) };
      }
      if (k === "achados") dados.achado = { tipo: d.achado.tipo === "encontrado" ? "encontrado" : "perdido", data: /^\d{4}-\d{2}-\d{2}$/.test(d.achado.data || "") ? d.achado.data : "", local: String(d.achado.local || "").replace(/[\n\r]+/g, " ").trim().slice(0, 80) };
      // Com o Storage ligado, as fotos novas vão para lá e o anúncio guarda só os links.
      dados.busca = termosBusca([dados.titulo, TIPOS_ITEM[dados.tipoItem], CATEGORIAS_COM[k]?.nome, dados.bairro, dados.cidade, dados.descricao]);
      if (temStorage()) dados.fotos = await Promise.all(dados.fotos.map((f, i) => subirFoto(f, `comunidade/${eu.uid}/${i}`)));
      if (JSON.stringify(dados).length > 950000) throw new Error("Fotos grandes demais. Tire uma e tente de novo.");
      // Distância: pelo centro da cidade (o anúncio não guarda endereço, só bairro e cidade).
      if (a) {
        // Campos que deixaram de valer (trocou de categoria não pode; mas limpa o que sobrou).
        await fb.setDoc(fb.doc(fb.db, "comunidade", a.id), { ...dados, criadoEm: a.criadoEm }, { merge: false });
        Object.assign(a, dados, { atualizadoEm: { toMillis: () => Date.now() } });
      } else {
        const ref = await fb.addDoc(fb.collection(fb.db, "comunidade"), { ...dados, criadoEm: fb.serverTimestamp() });
        const novo = { id: ref.id, ...dados, criadoEm: { toMillis: () => Date.now() }, atualizadoEm: { toMillis: () => Date.now() } };
        if (posEu) await comDistancia([novo], posEu);
        todos.unshift(novo);
      }
      sair(); pintar(); pintarMeus();
      toast(a ? "Anúncio atualizado" : "Publicado! Quem tiver interesse chama você no chat.");
    } catch (err) {
      env.disabled = false; env.textContent = a ? "Salvar" : "Publicar";
      toast(err?.code === "permission-denied" ? (banimento ? "Você está banido(a) da Comunidade." : "A Comunidade começa a funcionar quando a atualização do sistema for publicada. Se já foi, confira se não tem venda ou preço no texto.") : err?.message || "Não foi possível publicar agora.");
    }
  });
}
function mostrarRegras() {
  const { cx } = janela("Regras da Comunidade", "#e5487f");
  const ct = el("div", "cm-conteudo");
  ct.append(el("h2", null, "Regras da Comunidade"), el("p", "cm-sub", "A Comunidade é para ajudar: doar, trocar, pedir e dividir moradia, sem dinheiro no meio."));
  const ol = el("ol", "cm-regras"); REGRAS.forEach((r) => ol.appendChild(el("li", null, r))); ct.appendChild(ol);
  ct.append(el("h4", null, "Dicas de segurança"));
  const ul = el("ul", "cm-regras"); DICAS_SEGURANCA.forEach((r) => ul.appendChild(el("li", null, r))); ct.appendChild(ul);
  cx.appendChild(ct);
}
function avisoBanido() {
  const { cx } = janela("Banido da Comunidade", "#ef4444");
  const ct = el("div", "cm-conteudo");
  const ate = ms(banimento.ate);
  ct.append(el("h2", null, "Você não pode anunciar na Comunidade"), el("p", "cm-sub", ate ? `Até ${new Date(ate).toLocaleDateString("pt-BR")}.` : "Banimento sem data de fim."),
    el("p", "cm-desc", `Motivo: ${banimento.motivo || "descumprimento das regras (venda ou cobrança)"}.`));
  const a = el("a", "cm-btn pri", "Falar com o suporte"); a.href = "suporte.html";
  ct.appendChild(a);
  cx.appendChild(ct);
}

// ---------- início ----------
function ligarTela() {
  // Busca vinda da página inicial: comunidade.html?q=termo
  const q = new URLSearchParams(location.search).get("q");
  if (q && $("cmBusca")) $("cmBusca").value = q.slice(0, 80);
  $("cmChips")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    filtroCat = b.dataset.cat;
    document.querySelectorAll("#cmChips [data-cat]").forEach((x) => { const on = x === b; x.classList.toggle("active", on); x.setAttribute("aria-pressed", String(on)); });
    pintar();
  });
  const item = $("cmItem");
  if (item) { item.append(...Object.entries({ "": "Tudo", ...TIPOS_ITEM }).map(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; return o; })); item.addEventListener("change", () => { filtroItem = item.value; pintar(); }); }
  $("cmOrdem")?.addEventListener("change", (e) => { ordem = e.target.value; pintar(); });
  // Busca nacional: além dos anúncios já carregados, pergunta ao Firebase pela palavra digitada (busca.js).
  let espera = null;
  const buscarMais = async () => {
    const t = ($("cmBusca")?.value || "").trim();
    if (t.length < 3 || !fb) return;
    const achados = await buscarNoServidor(fb, "comunidade", t);
    const ja = new Set(todos.map((x) => x.id)), novos = achados.filter((x) => !ja.has(x.id));
    if (!novos.length) return;
    if (posEu) await comDistancia(novos, posEu).catch(() => {});
    todos.push(...novos); pintar();
  };
  $("cmBusca")?.addEventListener("input", () => { pintar(); clearTimeout(espera); espera = setTimeout(buscarMais, 400); });
  $("cmBuscaForm")?.addEventListener("submit", (e) => { e.preventDefault(); pintar(); buscarMais(); $("cmLista")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  document.querySelectorAll("[data-anunciar]").forEach((b) => b.addEventListener("click", () => abrirForm(null, b.dataset.anunciar || "doacao")));
  $("cmVerRegras")?.addEventListener("click", mostrarRegras);
  $("cmVerMeus")?.addEventListener("click", () => { $("cmMeusBox").hidden = !$("cmMeusBox").hidden; if (!$("cmMeusBox").hidden) $("cmMeusBox").scrollIntoView({ behavior: "smooth", block: "start" }); });
}
async function iniciar() {
  ligarTela();
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseDb) return;
  const [auth, firestore] = await Promise.all([import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"), import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")]);
  fb = { ...firestore, db: window.firebaseDb };
  auth.onAuthStateChanged(window.firebaseAuth, async (u) => {
    if (!u || eu) return;
    eu = u;
    conferirEmail(u);
    meuPerfil = await docComValidade(fb, ["perfis_publicos", u.uid], 30 * 60000).then((s) => (s.exists() ? s.data() : {})).catch(() => ({}));
    const [pos, ban, snap] = await Promise.all([
      minhaPosicao(meuPerfil).catch(() => null),
      fb.getDoc(fb.doc(fb.db, "programa_banidos", `${u.uid}_comunidade`)).then((s) => (s.exists() ? s.data() : null)).catch(() => null),
      fb.getDocs(fb.query(fb.collection(fb.db, "comunidade"), fb.orderBy("atualizadoEm", "desc"), fb.limit(150))).catch((e) => { console.warn("Comunidade:", e.code || e.message); return { docs: [] }; })
    ]);
    posEu = pos;
    banimento = ban && (!ms(ban.ate) || ms(ban.ate) > Date.now()) ? ban : null;
    $("cmBanido").hidden = !banimento;
    if (banimento) $("cmBanido").querySelector("span").textContent = `Você está banido(a) da Comunidade${ms(banimento.ate) ? " até " + new Date(ms(banimento.ate)).toLocaleDateString("pt-BR") : ""}. Motivo: ${banimento.motivo || "venda ou cobrança"}.`;
    todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Meus anúncios mais antigos (fora dos 150 recentes) também aparecem em "Meus anúncios".
    try {
      const meus = await fb.getDocs(fb.query(fb.collection(fb.db, "comunidade"), fb.where("donoId", "==", u.uid), fb.limit(50)));
      const ja = new Set(todos.map((x) => x.id));
      meus.docs.forEach((d) => { if (!ja.has(d.id)) todos.push({ id: d.id, ...d.data() }); });
    } catch {}
    if (posEu) await comDistancia(todos, posEu);
    if (posEu) { const o = $("cmOrdem"); if (o) o.querySelector('[value="perto"]').disabled = false; }
    pintar(); pintarMeus();
    // Chegou com uma busca (?q=): pergunta também ao Firebase, além dos 150 mais recentes.
    if (($("cmBusca")?.value || "").trim().length >= 3) $("cmBusca").dispatchEvent(new Event("input"));
    const p = new URLSearchParams(location.search);
    if (p.get("novo")) abrirForm(null, CATEGORIAS_COM[p.get("novo")] ? p.get("novo") : "doacao");
    else if (p.get("meus")) { $("cmMeusBox").hidden = false; $("cmMeusBox").scrollIntoView({ block: "start" }); }
    const idItem = p.get("item");
    if (idItem) {
      let a = todos.find((x) => x.id === idItem);
      if (!a) { try { const s = await fb.getDoc(fb.doc(fb.db, "comunidade", idItem)); if (s.exists()) a = { id: s.id, ...s.data() }; } catch {} }
      if (a && (a.donoId === eu.uid || (!oculto(a) && a.status !== "concluido"))) abrirItem(a); else toast("Este anúncio não está mais disponível.");
    }
    if (p.get("novo") || p.get("meus") || idItem) history.replaceState(history.state, "", "comunidade.html");
  });
}
if (document.getElementById("cmGrade")) iniciar();
