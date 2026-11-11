// =====================================================
// Entregas e corridas — tela de quem pede (entregas.html)
// Entrega (a encomenda vai sozinha) ou corrida (a pessoa vai junto): A → B no mapa, veículo, oferta de valor
// (sugestão pelo tamanho da rota; quem pede decide), quem leva (qualquer pessoa perto ou um entregador que
// a pessoa já conhece), procurar com raio que cresce sozinho, acompanhar ao vivo (o GPS de quem leva move o
// carrinho e, depois da coleta, a encomenda vai junto), PIN, cancelar, avaliar e histórico.
// Parâmetros: ?modo=entrega|corrida, ?id=PEDIDO (acompanhar), ?para=UID (quem recebe, do Mensagens),
// ?conversa=ID, ?entregador=UID (chamar uma pessoa específica).
// =====================================================
import { $, toast, erroAmigavel, fb, eu, dados, iniciarRede, mandarMensagem } from "./rede.js?v=141";
import { confirmarHF } from "./confirmar.js?v=6";
import { ligar } from "./chamadas.js?v=7";
import { criarMapa, buscarRota, buscarEndereco, enderecoDoPonto } from "./mapa-vivo.js?v=2";
import {
  SERVICOS, VEICULOS, MODALIDADES, TAMANHOS, PAGAMENTOS, ATIVAS, NOMES_ETAPA, ELOGIOS, MOTIVOS_CANCELAR, RAIOS, VALOR_MIN, VALOR_MAX,
  modalidadesDe, modalidadesDoVeiculo, textoStatus, passo, pinEm, expirada, faixaValor, valorSugerido, minutosAte, distanciaKm, kmPelaRua,
  geohash, vizinhos, gerarPin, noBrasil, reais, textoKm, textoMin, formatarPlaca
} from "./corridas-base.js?v=1";
import { h, ic, icExtra, veicIcone, botao, ms, hora, dataCurta, textoVeiculo, avatar, avisarSom, lerGps, garantirConversa, irPara, abrirTela } from "./entregas-comum.js?v=3";

const params = new URLSearchParams(location.search);
const S = {
  servico: params.get("modo") === "corrida" ? "corrida" : "entrega",
  origem: null, destino: null, rota: null,
  mod: "", tamanho: "P", oque: "", contato: { nome: "", telefone: "", obs: "" },
  pagamento: "pix", valor: 0, valorMexido: false,
  para: null, dest: null, conversaId: params.get("conversa") || "", presente: null,
  minha: null, perto: []
};
let M = null, vista = "", atual = null, pararPedido = null, pinPedido = "", notaEnt = null, fotoEnt = "", rotaViva = null, enviando = false;
const painel = () => $("painel");

// ---------- início ----------
(async () => {
  try { await iniciarRede(); }
  catch (e) { painel().replaceChildren(h("p", "ent-sub", e.message || "Entre na sua conta.")); return; }
  try { M = await criarMapa($("mapa")); }
  catch { $("mapa").classList.add("sem-mapa"); }
  ligarTopo();
  medirPainel();
  // Onde a pessoa está (para começar a coleta ali e mostrar quem está perto).
  lerGps().then(async (p) => {
    if (!p || !noBrasil(p)) return;
    S.minha = p;
    M?.marcar("eu", "eu", p);
    if (vista === "pedir") origemPelaMinha();
  });
  if (params.get("id")) { acompanhar(params.get("id")); return; }
  // Pedido em andamento: abre direto nele (como nos apps de corrida).
  try {
    const q = fb.query(fb.collection(fb.db, "corridas"), fb.where("clienteId", "==", eu.uid), fb.where("status", "in", ["procurando", ...ATIVAS]), fb.limit(3));
    const s = await fb.getDocs(q);
    const vivo = s.docs.map((d) => ({ id: d.id, ...d.data() })).find((c) => !expirada(c));
    if (vivo) { toast("Você tem um pedido em andamento"); acompanhar(vivo.id); return; }
  } catch {}
  await prepararParametros();
  mostrarPedir();
})();

async function prepararParametros() {
  const para = params.get("para"), ent = params.get("entregador"), pres = params.get("presente");
  // Corrida ou entrega de presente: quem deu paga (direto para quem leva), até o valor do presente.
  if (pres) {
    try {
      const d = await fb.getDoc(fb.doc(fb.db, "presentes", pres));
      const p = d.exists() ? { id: d.id, ...d.data() } : null;
      if (p && p.para === eu.uid && p.status === "aceito" && (p.tipo === "corrida" || p.tipo === "entrega")) {
        S.presente = p; S.servico = p.tipo; S.pagamento = "presente";
        S.mod = p.tipo === "corrida" ? "corrida_carro" : "entrega_moto";
      } else if (p) toast(p.status === "usado" ? "Esse presente já foi usado." : "Esse presente não pode ser usado aqui.");
    } catch { toast("Não foi possível ler o presente."); }
  }
  if (para && para !== eu.uid) {
    try {
      const p = await fb.getDoc(fb.doc(fb.db, "perfis_publicos", para));
      if (p.exists()) { S.dest = { uid: para, nome: p.data().nome || "", foto: p.data().fotoPerfil || "" }; S.contato.nome = S.dest.nome; }
    } catch {}
  }
  if (ent && ent !== eu.uid) await escolherEntregadorPorUid(ent, true);
}

function ligarTopo() {
  $("btVoltar").addEventListener("click", () => {
    if (history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) history.back();
    else irPara("index.html");
  });
  $("btHistorico").addEventListener("click", abrirHistorico);
  $("btMinhaPos").addEventListener("click", async () => {
    const p = S.minha || await lerGps();
    if (!p) { toast("Ative a localização do aparelho para usar o mapa."); return; }
    S.minha = p; M?.marcar("eu", "eu", p); M?.irPara(p, 16);
  });
}
// O botão "minha localização" fica sempre acima do painel.
function medirPainel() {
  const p = painel();
  const medir = () => document.documentElement.style.setProperty("--painel-h", p.offsetHeight + "px");
  if ("ResizeObserver" in window) new ResizeObserver(medir).observe(p);
  medir();
}
function topo(titulo, sub = "", online = true) {
  $("tituloTopo").textContent = titulo;
  $("subTopo").textContent = sub;
  $("pontoTopo").classList.toggle("off", !online);
}

// =====================================================
// PEDIR
// =====================================================
// Sem coleta escolhida: começa onde a pessoa está (com o nome da rua quando chegar).
async function origemPelaMinha() {
  const p = S.minha;
  if (!p || S.origem) return;
  S.origem = { lat: p.lat, lng: p.lng, nome: "Minha localização", sub: "" };
  M?.irPara(p, 16);
  pintar(); aoMudarRota(); vigiarPerto(true);
  const e = await enderecoDoPonto(p);
  if (e && S.origem && S.origem.lat === p.lat && S.origem.nome === "Minha localização") { S.origem = { ...S.origem, nome: e.nome || "Minha localização", sub: e.sub || "" }; if (vista === "pedir") pintar(); }
}
function mostrarPedir() {
  vista = "pedir";
  pararPedido?.(); pararPedido = null;
  M?.tirarRadar();
  topo(SERVICOS[S.servico].acao);
  if (!S.mod || MODALIDADES[S.mod]?.servico !== S.servico) S.mod = S.servico === "corrida" ? "corrida_carro" : "entrega_moto";
  pintar();
  aoMudarRota();
  vigiarPerto();
  origemPelaMinha();
}

function pintar() {
  if (vista !== "pedir") return;
  const p = painel();
  p.classList.remove("baixo");
  const frag = document.createDocumentFragment();
  // Entrega | Corrida
  const abas = h("div", "ent-abas"); abas.setAttribute("role", "tablist");
  for (const [k, nome, v] of [["entrega", "Entrega", "pacote"], ["corrida", "Corrida", "carro"]]) {
    const b = h("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(S.servico === k)); b.dataset.servico = k;
    b.append(veicIcone(v), document.createTextNode(nome));
    if (S.presente && S.presente.tipo !== k) b.disabled = true;
    b.addEventListener("click", () => {
      if (S.servico === k || S.presente) return;
      S.servico = k; S.mod = k === "corrida" ? "corrida_carro" : "entrega_moto"; S.valorMexido = false;
      if (S.para && !modalidadesDoVeiculo(S.para.veiculo, [k]).length) { toast(`${S.para.nome} não faz ${k === "corrida" ? "corridas" : "entregas"}. Vamos procurar qualquer pessoa perto.`); S.para = null; }
      else if (S.para) S.mod = modalidadesDoVeiculo(S.para.veiculo, [k])[0];
      topo(SERVICOS[k].acao);
      pintar(); aoMudarRota(); vigiarPerto(true);
    });
    abas.appendChild(b);
  }
  frag.appendChild(abas);
  // A → B
  const rota = h("div", "ent-rota");
  rota.append(linhaEndereco("origem", "a", S.servico === "corrida" ? "Partida" : "Coleta", S.origem, "De onde sai?"),
    linhaEndereco("destino", "b", S.servico === "corrida" ? "Destino" : "Entrega", S.destino, S.servico === "corrida" ? "Para onde vamos?" : "Para onde vai?"));
  frag.appendChild(rota);
  if (S.presente) {
    const n = h("div", "ent-nota"); n.dataset.presente = "";
    n.append(ic("estrela"), h("span", null, `🎁 Presente de ${S.presente.deNome || "alguém"}: até ${reais(S.presente.valor)}. ${(S.presente.deNome || "Quem deu").split(" ")[0]} paga direto para quem levar e acompanha no mapa.`));
    frag.appendChild(n);
  }
  if (S.dest) {
    const n = h("div", "ent-nota"); n.append(ic("pessoa"), h("span", null, `Para ${S.dest.nome}: ${S.dest.nome.split(" ")[0]} acompanha a entrega pelo Mensagens e recebe o PIN.`));
    frag.appendChild(n);
  }
  if (!S.origem || !S.destino) {
    frag.appendChild(h("p", "ent-sub", S.servico === "corrida"
      ? "Escolha a partida e o destino. Você vê o carro chegando no mapa, o nome, a foto e a placa de quem vai te levar."
      : "Escolha onde buscar e onde entregar. Depois da coleta, você acompanha a encomenda no mapa até chegar."));
    frag.appendChild(blocoQuem());
    p.replaceChildren(frag);
    return;
  }
  if (S.rota) {
    const sub = h("p", "ent-sub", `${textoKm(S.rota.km)} pela rua${S.rota.real ? "" : " (aproximado)"} · cerca de ${textoMin(S.rota.min)}`);
    frag.appendChild(sub);
  }
  // Veículos
  frag.appendChild(h("h3", null, S.servico === "corrida" ? "Como você vai" : "Como vai a encomenda"));
  const ops = h("div", "ent-ops"); ops.setAttribute("role", "radiogroup");
  for (const m of modalidadesDe(S.servico)) ops.appendChild(opcaoModalidade(m));
  frag.appendChild(ops);
  if (S.servico === "entrega") {
    frag.appendChild(h("h3", null, "O que vai"));
    const c = campo("O que é? (ex.: documentos, bolo, notebook)", "text", S.oque, (v) => { S.oque = v; atualizarBotao(); }, 80);
    c.querySelector("input").id = "entOque";
    frag.appendChild(c);
    const tam = h("div", "ent-chips");
    for (const [k, t] of Object.entries(TAMANHOS)) {
      const b = h("button", "ent-chip"); b.type = "button"; b.setAttribute("aria-pressed", String(S.tamanho === k)); b.dataset.tam = k;
      b.append(h("b", null, t.nome)); b.title = t.desc;
      b.addEventListener("click", () => {
        S.tamanho = k;
        // Tamanho que não cabe no veículo: troca para um que cabe.
        if (!MODALIDADES[S.mod].tamanhos.includes(k)) { const novo = modalidadesDe("entrega").find((m) => m.tamanhos.includes(k) && (!S.para || m.veiculo === S.para.veiculo)); if (novo) { S.mod = novo.k; S.valorMexido = false; recalcularValor(); } else if (S.para) toast(`${t.nome} não cabe no veículo de ${S.para.nome}.`); }
        pintar();
      });
      tam.appendChild(b);
    }
    frag.appendChild(tam);
    frag.appendChild(h("p", "ent-sub", TAMANHOS[S.tamanho].desc));
    frag.appendChild(h("h3", null, "Quem recebe"));
    if (!S.dest) {
      const d = h("div", "ent-duplo");
      d.append(campo("Nome", "text", S.contato.nome, (v) => (S.contato.nome = v), 80), campo("Telefone", "tel", S.contato.telefone, (v) => (S.contato.telefone = v), 20));
      frag.appendChild(d);
    }
  }
  frag.appendChild(campo(S.servico === "corrida" ? "Recado para o motorista (opcional)" : "Instruções (apto, portaria, ponto de referência)", "textarea", S.contato.obs, (v) => (S.contato.obs = v), 300));
  frag.appendChild(blocoQuem());
  // Oferta
  frag.appendChild(h("h3", null, "Sua oferta"));
  frag.appendChild(blocoOferta());
  frag.appendChild(h("h3", null, "Pagamento"));
  const pg = h("div", "ent-chips");
  if (S.presente) pg.appendChild(h("span", "ent-chip", `Presente · pago por ${(S.presente.deNome || "quem deu").split(" ")[0]}`)).setAttribute("aria-pressed", "true");
  else
  for (const [k, nome] of Object.entries(S.presente ? {} : PAGAMENTOS)) {
    const b = h("button", "ent-chip", k === "pix" ? "Pix" : k === "dinheiro" ? "Dinheiro" : "Cartão"); b.type = "button"; b.title = nome; b.setAttribute("aria-pressed", String(S.pagamento === k));
    b.addEventListener("click", () => { S.pagamento = k; pg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });
    pg.appendChild(b);
  }
  frag.appendChild(pg);
  const nota = h("div", "ent-nota"); nota.append(ic("cadeado"), h("span", null, `O pagamento é feito direto para quem leva, quando ${S.servico === "corrida" ? "a viagem termina" : "a encomenda é entregue"}. O Help Floripa conecta vocês e não cobra nada nesta etapa.`));
  frag.appendChild(nota);
  const btn = botao("", "ent-btn", criarPedido); btn.id = "btPedir";
  frag.appendChild(btn);
  p.replaceChildren(frag);
  atualizarBotao();
}

function linhaEndereco(qual, letra, rotulo, ponto, vazio) {
  const b = h("button", "ent-end"); b.type = "button"; b.dataset.end = qual;
  const l = h("span", "letra" + (letra === "b" ? " b" : ""), letra.toUpperCase());
  const t = h("span");
  t.append(h("small", null, rotulo), h("b", ponto ? null : "vazio", ponto ? ponto.nome : vazio));
  if (ponto?.sub) t.appendChild(h("i", null, ponto.sub));
  b.append(l, t);
  b.addEventListener("click", () => abrirEndereco(qual));
  return b;
}
function campo(rotulo, tipo, valor, aoMudar, max) {
  const l = h("label", "ent-campo");
  l.appendChild(h("span", null, rotulo));
  const i = tipo === "textarea" ? h("textarea") : h("input");
  if (tipo !== "textarea") i.type = tipo;
  if (tipo === "tel") { i.inputMode = "tel"; i.autocomplete = "tel"; }
  i.value = valor || ""; i.maxLength = max;
  i.addEventListener("input", () => aoMudar(i.value));
  l.appendChild(i);
  return l;
}
function veiculoDe(mod) { return MODALIDADES[mod]?.veiculo || "carro"; }
function minutosDe(mod) {
  if (!S.rota) return 0;
  const v = veiculoDe(mod);
  if (!S.rota.real) return minutosAte(S.rota.km, v);
  return v === "bike" ? S.rota.km / 14 * 60 : v === "moto" ? S.rota.min * .85 : v === "utilitario" ? S.rota.min * 1.1 : S.rota.min;
}
// Quem está online perto, por veículo: quantos e quanto tempo o mais perto leva até a coleta.
function pertoDe(veiculo) {
  const l = S.perto.filter((x) => x.veiculo === veiculo && (!S.origem || distanciaKm(x, S.origem) <= 15));
  if (!l.length || !S.origem) return { n: l.length, min: 0 };
  const km = Math.min(...l.map((x) => kmPelaRua(x, S.origem)));
  return { n: l.length, min: minutosAte(km, veiculo) + 1 };
}
function opcaoModalidade(m) {
  const b = h("button", "ent-op"); b.type = "button"; b.setAttribute("role", "radio"); b.dataset.mod = m.k;
  b.setAttribute("aria-checked", String(S.mod === m.k));
  const km = S.rota?.km || 0;
  const cabe = S.servico !== "entrega" || m.tamanhos.includes(S.tamanho);
  const longe = km > m.maxKm;
  const doPara = !S.para || S.para.veiculo === m.veiculo;
  b.disabled = !cabe || longe || !doPara;
  const icb = h("span", "ic"); icb.appendChild(veicIcone(m.veiculo));
  const tx = h("span");
  tx.append(h("b", null, m.nome));
  const pt = pertoDe(m.veiculo);
  const linha = h("small");
  if (!doPara) linha.textContent = `${S.para.nome.split(" ")[0]} não usa ${VEICULOS[m.veiculo].nome.toLowerCase()}`;
  else if (longe) linha.textContent = `Até ${m.maxKm} km`;
  else if (!cabe) linha.textContent = `Não cabe: ${TAMANHOS[S.tamanho].nome.toLowerCase()}`;
  else if (S.para) linha.textContent = m.desc;
  else if (pt.n) { const s = h("span", "perto", `${pt.n} perto`); linha.append(s, document.createTextNode(` · chega em ~${pt.min} min`)); }
  else linha.textContent = m.desc;
  tx.appendChild(linha);
  const preco = h("span", "preco");
  if (S.rota) { preco.textContent = reais(valorSugerido(m.k, km, minutosDe(m.k))); preco.appendChild(h("small", null, textoMin(minutosDe(m.k)))); }
  b.append(icb, tx, preco);
  b.addEventListener("click", () => { S.mod = m.k; S.valorMexido = false; recalcularValor(); pintar(); aoMudarRota(true); });
  return b;
}
const valorTeto = () => (S.presente ? Math.min(VALOR_MAX, Number(S.presente.valor) || 0) : VALOR_MAX);
function recalcularValor() {
  if (!S.rota) return;
  if (!S.valorMexido) S.valor = valorSugerido(S.mod, S.rota.km, minutosDe(S.mod));
  S.valor = Math.min(S.valor, valorTeto());
}
function blocoOferta() {
  recalcularValor();
  const caixa = h("div");
  const of = h("div", "ent-oferta");
  const menos = h("button", null, "−"); menos.type = "button"; menos.setAttribute("aria-label", "Diminuir R$ 1");
  const mais = h("button", null, "+"); mais.type = "button"; mais.setAttribute("aria-label", "Aumentar R$ 1");
  const meio = h("div", "valor");
  const inp = h("input"); inp.inputMode = "decimal"; inp.id = "entValor"; inp.setAttribute("aria-label", "Valor oferecido em reais");
  const dica = h("small");
  meio.append(inp, dica);
  of.append(menos, meio, mais);
  const faixa = () => faixaValor(S.mod, S.rota?.km || 0, minutosDe(S.mod));
  const mostrar = () => {
    inp.value = reais(S.valor);
    const f = faixa();
    const baixo = S.valor < f.baixo;
    dica.className = baixo ? "baixo" : "";
    dica.textContent = baixo ? `Abaixo do sugerido (${reais(f.sugerido)}): pode demorar` : `Sugerido: ${reais(f.sugerido)}`;
    if (S.presente) dica.textContent += ` · presente até ${reais(valorTeto())}`;
    atualizarBotao();
  };
  const mudar = (v) => {
    if (v > valorTeto() && S.presente) toast(`O presente cobre até ${reais(valorTeto())}.`);
    S.valor = Math.min(valorTeto(), Math.max(VALOR_MIN, Math.round(v * 2) / 2)); S.valorMexido = true; mostrar();
  };
  menos.addEventListener("click", () => mudar(S.valor - 1));
  mais.addEventListener("click", () => mudar(S.valor + 1));
  inp.addEventListener("focus", () => { inp.value = String(S.valor).replace(".", ","); inp.select(); });
  inp.addEventListener("blur", () => { const v = Number(String(inp.value).replace(/[^\d,.]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")); if (Number.isFinite(v) && v > 0) mudar(v); else mostrar(); });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") inp.blur(); });
  mostrar();
  caixa.appendChild(of);
  const n = h("div", "ent-nota"); n.append(ic("ajuda"), h("span", null, "A sugestão vem da distância e do tempo. Você decide quanto oferece: valores maiores costumam ser aceitos mais rápido."));
  caixa.appendChild(n);
  return caixa;
}
function blocoQuem() {
  const box = h("div");
  box.appendChild(h("h3", null, S.servico === "corrida" ? "Quem leva você" : "Quem leva"));
  const b = h("button", "ent-quem"); b.type = "button"; b.id = "btQuem";
  const av = h("span", "avatar");
  const tx = h("span");
  if (S.para) {
    avatar(av, S.para.foto, S.para.nome);
    tx.append(h("b", null, S.para.nome), h("small", null, `${textoVeiculo(S.para)} · só ${S.para.nome.split(" ")[0]} recebe o pedido`));
    const x = h("span", "x"); x.appendChild(ic("fechar")); x.title = "Voltar para qualquer pessoa perto";
    x.addEventListener("click", (e) => { e.stopPropagation(); S.para = null; pintar(); vigiarPerto(true); });
    b.append(av, tx, x);
  } else {
    av.appendChild(ic("lupa"));
    tx.append(h("b", null, `Qualquer ${SERVICOS[S.servico].quem} perto`), h("small", null, `Mais rápido. Tem um ${SERVICOS[S.servico].quem} de confiança? Toque para chamar ele.`));
    b.append(av, tx);
  }
  b.addEventListener("click", abrirEscolherQuem);
  box.appendChild(b);
  return box;
}
function atualizarBotao() {
  const b = $("btPedir"); if (!b) return;
  const falta = !S.origem ? "Escolha de onde sai" : !S.destino ? "Escolha o destino" : (S.servico === "entrega" && S.oque.trim().length < 2) ? "Diga o que vai" : "";
  b.disabled = !!falta || enviando;
  b.textContent = enviando ? "Pedindo..." : falta || `${SERVICOS[S.servico].acao} · ${reais(S.valor)}`;
}

// ---------- rota no mapa ----------
let geracaoRota = 0;
async function aoMudarRota(soVeiculo = false) {
  if (!M) return;
  M.marcar("origem", "origem", S.origem);
  M.marcar("destino", "destino", S.destino);
  if (!S.origem || !S.destino) {
    S.rota = null; M.tirarRota();
    if (S.origem) M.irPara(S.origem, 15);
    return;
  }
  if (soVeiculo && S.rota) return;
  const g = ++geracaoRota;
  const r = await buscarRota(S.origem, S.destino, veiculoDe(S.mod));
  if (g !== geracaoRota || vista !== "pedir") return;
  S.rota = r;
  M.desenharRota(r.pontos);
  M.enquadrar([S.origem, S.destino], { baixo: innerWidth >= 900 ? 0 : painel().offsetHeight });
  // Bike tem limite de distância: troca sozinho se passar.
  if (r.km > MODALIDADES[S.mod].maxKm && !S.para) { const outro = modalidadesDe(S.servico).find((m) => r.km <= m.maxKm && (S.servico !== "entrega" || m.tamanhos.includes(S.tamanho))); if (outro) S.mod = outro.k; }
  if (r.km > 400) toast("Distância muito grande para uma entrega ou corrida.");
  recalcularValor();
  pintar();
}

// ---------- quem está online perto ----------
let timerPerto = 0;
function vigiarPerto(agora = false) {
  clearInterval(timerPerto);
  const ler = async () => {
    if (!["pedir", "procurando"].includes(vista)) return;
    const base = S.origem || S.minha;
    if (!base) return;
    try {
      const q = fb.query(fb.collection(fb.db, "entregadores_online"), fb.where("geo4", "in", vizinhos(base.lat, base.lng, 4)), fb.limit(80));
      const s = await fb.getDocs(q);
      const limite = Date.now() - 3 * 60000;
      S.perto = s.docs.map((d) => d.data()).filter((x) => x.uid !== eu.uid && !x.ocupado && ms(x.em) > limite && (x.servicos || []).includes(S.servico));
    } catch { S.perto = []; }
    desenharPerto();
    if (vista === "pedir") document.querySelectorAll(".ent-op").forEach((b) => b.replaceWith(opcaoModalidade({ k: b.dataset.mod, ...MODALIDADES[b.dataset.mod] })));
  };
  if (agora || !S.perto.length) ler();
  timerPerto = setInterval(ler, 30000);
}
function desenharPerto() {
  if (!M) return;
  const nomes = [];
  S.perto.filter((x) => !S.para || x.uid === S.para.uid).slice(0, 25).forEach((x) => {
    const n = "livre_" + x.uid; nomes.push(n);
    if (M.posicao(n)) M.mover(n, x, { ms: 2500 });
    else M.marcar(n, "veiculo", x, { veiculo: x.veiculo, classe: "livre" });
  });
  M.nomes().filter((n) => n.startsWith("livre_") && !nomes.includes(n)).forEach((n) => M.tirar(n));
}

// ---------- escolher endereço ----------
const chaveLocais = () => `hf-ent-locais-${eu.uid}`;
function locaisRecentes() { try { return JSON.parse(localStorage.getItem(chaveLocais()) || "[]"); } catch { return []; } }
function guardarLocal(p) {
  if (!p || p.nome === "Minha localização") return;
  const l = locaisRecentes().filter((x) => Math.abs(x.lat - p.lat) > 1e-4 || Math.abs(x.lng - p.lng) > 1e-4);
  l.unshift({ lat: p.lat, lng: p.lng, nome: p.nome, sub: p.sub || "" });
  try { localStorage.setItem(chaveLocais(), JSON.stringify(l.slice(0, 8))); } catch {}
}
function abrirEndereco(qual) {
  const rotulo = qual === "origem" ? (S.servico === "corrida" ? "Partida" : "Onde buscar") : (S.servico === "corrida" ? "Para onde?" : "Onde entregar");
  const { corpo, campo, fechar } = abrirTela(rotulo, { busca: true, placeholder: qual === "origem" ? "Buscar endereço de coleta" : "Buscar rua, número, lugar..." });
  const escolher = (p) => { S[qual] = { lat: p.lat, lng: p.lng, nome: String(p.nome || "Ponto no mapa").slice(0, 120), sub: String(p.sub || "").slice(0, 160) }; guardarLocal(S[qual]); fechar(); S.valorMexido = false; pintar(); aoMudarRota(); vigiarPerto(true); };
  const item = (icone, titulo, sub, fn, extra) => {
    const b = h("button", "ent-res"); b.type = "button";
    const i = h("span", "ic"); i.appendChild(icone);
    const t = h("span"); t.append(h("b", null, titulo)); if (sub) t.appendChild(h("small", null, sub));
    b.append(i, t); if (extra) b.dataset.res = extra;
    b.addEventListener("click", fn);
    return b;
  };
  const fixos = h("div");
  fixos.appendChild(item(ic("bussola"), "Usar minha localização", "Pelo GPS do aparelho", async () => {
    const p = await lerGps(); if (!p || !noBrasil(p)) { toast("Não foi possível pegar sua localização. Ative o GPS ou busque o endereço."); return; }
    S.minha = p; M?.marcar("eu", "eu", p);
    const e = await enderecoDoPonto(p);
    escolher({ ...p, nome: e?.nome || "Minha localização", sub: e?.sub || "" });
  }));
  fixos.appendChild(item(ic("local"), "Escolher no mapa", "Arraste o mapa até o ponto", () => { fechar(); escolherNoMapa(qual); }));
  const rec = locaisRecentes();
  const lista = h("div");
  const mostrarRecentes = () => {
    lista.replaceChildren();
    if (rec.length) { lista.appendChild(h("h3", null, "Recentes")); rec.forEach((p) => lista.appendChild(item(ic("relogio"), p.nome, p.sub, () => escolher(p)))); }
  };
  mostrarRecentes();
  corpo.append(fixos, lista);
  let t = 0, g = 0;
  campo.addEventListener("input", () => {
    clearTimeout(t);
    const q = campo.value.trim();
    if (q.length < 3) { mostrarRecentes(); return; }
    t = setTimeout(async () => {
      const minha = ++g;
      lista.replaceChildren(h("p", "ent-vazio", "Buscando..."));
      const r = await buscarEndereco(q, S.minha || S.origem || M?.centro());
      if (minha !== g) return;
      lista.replaceChildren();
      const ok = r.filter(noBrasil);
      if (!ok.length) { lista.appendChild(h("p", "ent-vazio", "Nada encontrado. Tente com o número e o bairro, ou escolha no mapa.")); return; }
      ok.forEach((p, i) => lista.appendChild(item(ic("local"), p.nome, p.sub, () => escolher(p), String(i))));
    }, 450);
  });
}
function escolherNoMapa(qual) {
  if (!M) { toast("Mapa indisponível."); return; }
  const antes = vista; vista = "mapa";
  $("alvoMapa").hidden = false;
  const p = painel(); p.classList.add("baixo");
  const tx = h("b", null, "Mova o mapa até o ponto");
  const sub = h("small", "ent-sub", "");
  const ok = botao(qual === "origem" ? "Confirmar ponto de saída" : "Confirmar destino", "ent-btn", async () => {
    const c = M.centro();
    if (!noBrasil(c)) { toast("Escolha um ponto no Brasil."); return; }
    terminar();
    const e = await enderecoDoPonto(c);
    S[qual] = { lat: c.lat, lng: c.lng, nome: String(e?.nome || "Ponto no mapa").slice(0, 120), sub: String(e?.sub || "").slice(0, 160) };
    guardarLocal(S[qual]); S.valorMexido = false;
    pintar(); aoMudarRota(); vigiarPerto(true);
  });
  const cancelar = botao("Cancelar", "ent-btn sec", () => { terminar(); pintar(); });
  const caixa = h("div"); caixa.append(tx, h("br"), sub, ok, cancelar);
  p.replaceChildren(caixa);
  if (S[qual]) M.irPara(S[qual], 17); else if (S.minha) M.irPara(S.minha, 17);
  let t = 0;
  const aoMover = () => { clearTimeout(t); sub.textContent = "..."; t = setTimeout(async () => { const e = await enderecoDoPonto(M.centro()); sub.textContent = e ? [e.nome, e.sub].filter(Boolean).join(" · ") : ""; }, 600); };
  M.map.on("moveend", aoMover); aoMover();
  function terminar() { M.map.off("moveend", aoMover); $("alvoMapa").hidden = true; p.classList.remove("baixo"); vista = antes; }
}

// ---------- quem leva: qualquer pessoa ou um entregador conhecido ----------
async function lerEntregador(uid) {
  const [e, p] = await Promise.all([fb.getDoc(fb.doc(fb.db, "entregadores", uid)), fb.getDoc(fb.doc(fb.db, "perfis_publicos", uid)).catch(() => null)]);
  const pub = p?.exists() ? p.data() : {};
  return { cadastro: e.exists() ? e.data() : null, nome: pub.nome || e.data()?.nome || "Entregador", foto: pub.fotoPerfil || "", nick: pub.nickname || "" };
}
async function escolherEntregadorPorUid(uid, calado = false) {
  try {
    const r = await lerEntregador(uid);
    if (!r.cadastro || r.cadastro.status !== "ativo") { if (!calado) toast(`${r.nome} não está atendendo pelo Help Floripa agora.`); return false; }
    const servicos = r.cadastro.servicos || [];
    if (!servicos.includes(S.servico)) { if (servicos.length) { S.servico = servicos[0]; } else return false; }
    const mods = modalidadesDoVeiculo(r.cadastro.veiculo, [S.servico]);
    if (!mods.length) { if (!calado) toast(`${r.nome} não faz ${S.servico === "corrida" ? "corridas" : "entregas"}.`); return false; }
    S.para = { uid, nome: r.nome, foto: r.foto, veiculo: r.cadastro.veiculo, modelo: r.cadastro.modelo || "", cor: r.cadastro.cor || "", placa: r.cadastro.placa || "" };
    S.mod = mods.includes(S.mod) ? S.mod : mods[0];
    if (S.servico === "entrega" && !MODALIDADES[S.mod].tamanhos.includes(S.tamanho)) S.tamanho = MODALIDADES[S.mod].tamanhos[0];
    S.valorMexido = false;
    return true;
  } catch { if (!calado) toast("Não foi possível ler o cadastro."); return false; }
}
function linkConvite() {
  const nick = dados.nickname ? `?convite=${encodeURIComponent(dados.nickname)}` : "";
  return `https://helpfloripa.com.br/entregador.html${nick}`;
}
function textoConvite(nome) {
  return `${nome ? nome.split(" ")[0] + ", q" : "Q"}uero te chamar para ${S.servico === "corrida" ? "corridas" : "entregas"} pelo Help Floripa. Faça seu cadastro de entregador (é rápido) e eu te chamo direto pelo app: ${linkConvite()}`;
}
function blocoConvidar(nome) {
  const box = h("div", "eg-convite");
  const tx = h("span", null, nome ? `${nome} ainda não é entregador no Help Floripa. Convide para se cadastrar: depois você chama ${nome.split(" ")[0]} direto por aqui.` : "Seu entregador ou motorista ainda não está no Help Floripa? Convide para se cadastrar e chame direto por aqui.");
  box.appendChild(tx);
  const acoes = h("div", "ent-acoes");
  const w = h("a", "ent-acao"); w.href = `https://wa.me/?text=${encodeURIComponent(textoConvite(nome))}`; w.target = "_blank"; w.rel = "noopener"; w.append(ic("whats"), document.createTextNode("WhatsApp"));
  const c = h("button", "ent-acao"); c.type = "button"; c.append(ic("compartilhar"), document.createTextNode("Enviar convite"));
  c.addEventListener("click", async () => {
    const t = textoConvite(nome);
    try { if (navigator.share) { await navigator.share({ title: "Help Floripa", text: t }); return; } } catch { return; }
    navigator.clipboard?.writeText(t).then(() => toast("Convite copiado"), () => toast(t));
  });
  acoes.append(w, c);
  const caixa = h("div"); caixa.append(box, acoes);
  return caixa;
}
async function abrirEscolherQuem() {
  const quem = SERVICOS[S.servico].quem;
  const { corpo, campo, fechar } = abrirTela(`Escolher ${quem}`, { busca: true, placeholder: `@ do ${quem} no Help Floripa` });
  const linha = (icone, titulo, sub, fn, ativo) => {
    const b = h("button", "ent-res"); b.type = "button";
    const i = h("span", "ic"); i.appendChild(icone);
    const t = h("span"); t.append(h("b", null, titulo)); if (sub) t.appendChild(h("small", null, sub));
    b.append(i, t); if (ativo) b.style.background = "var(--soft)";
    b.addEventListener("click", fn);
    return b;
  };
  const res = h("div"), fixos = h("div");
  fixos.appendChild(linha(ic("lupa"), `Qualquer ${quem} perto`, "O primeiro que aceitar leva (mais rápido)", () => { S.para = null; fechar(); pintar(); vigiarPerto(true); }, !S.para));
  corpo.append(res, fixos);
  // Favoritos e quem já levou para a pessoa.
  const conhecidos = h("div"); corpo.appendChild(conhecidos);
  corpo.appendChild(h("h3", null, "Seu entregador não está aqui?"));
  corpo.appendChild(blocoConvidar(""));
  (async () => {
    const ids = new Set((Array.isArray(dados.entregadoresFavoritos) ? dados.entregadoresFavoritos : []).slice(0, 20));
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "corridas"), fb.where("clienteId", "==", eu.uid), fb.where("status", "==", "concluida"), fb.limit(40)));
      s.docs.forEach((d) => d.data().entregadorId && ids.add(d.data().entregadorId));
    } catch {}
    if (!ids.size) return;
    conhecidos.appendChild(h("h3", null, "Seus entregadores"));
    for (const uid of [...ids].slice(0, 15)) {
      try {
        const r = await lerEntregador(uid);
        if (!r.cadastro) continue;
        const fav = (dados.entregadoresFavoritos || []).includes(uid);
        const av = h("span", "avatar"); av.style.cssText = "width:38px;height:38px;border-radius:50%;overflow:hidden;display:grid;place-items:center"; avatar(av, r.foto, r.nome);
        const b = linha(av, r.nome, `${fav ? "★ Favorito · " : ""}${textoVeiculo(r.cadastro)}${r.cadastro.status !== "ativo" ? " · pausado" : ""}`, async () => {
          if (await escolherEntregadorPorUid(uid)) { fechar(); pintar(); aoMudarRota(true); vigiarPerto(true); }
        }, S.para?.uid === uid);
        b.querySelector(".ic").replaceWith(av);
        conhecidos.appendChild(b);
      } catch {}
    }
  })();
  let t = 0;
  campo.addEventListener("input", () => {
    clearTimeout(t);
    const nick = campo.value.trim().replace(/^@/, "").toLowerCase();
    if (nick.length < 3) { res.replaceChildren(); return; }
    t = setTimeout(async () => {
      res.replaceChildren(h("p", "ent-vazio", "Procurando..."));
      try {
        const n = await fb.getDoc(fb.doc(fb.db, "nicknames", nick));
        const uid = n.exists() ? n.data().uid : "";
        if (!uid) { res.replaceChildren(h("p", "ent-vazio", `Ninguém com o @${nick} no Help Floripa.`)); return; }
        if (uid === eu.uid) { res.replaceChildren(h("p", "ent-vazio", "Esse é você.")); return; }
        const r = await lerEntregador(uid);
        res.replaceChildren();
        if (!r.cadastro) { res.appendChild(blocoConvidar(r.nome)); return; }
        const av = h("span", "avatar"); av.style.cssText = "width:38px;height:38px;border-radius:50%;overflow:hidden;display:grid;place-items:center"; avatar(av, r.foto, r.nome);
        const b = linha(av, r.nome, `@${nick} · ${textoVeiculo(r.cadastro)}${r.cadastro.status !== "ativo" ? " · pausado agora" : ""}`, async () => {
          if (await escolherEntregadorPorUid(uid)) { fechar(); pintar(); aoMudarRota(true); vigiarPerto(true); }
        });
        b.querySelector(".ic").replaceWith(av); b.dataset.achado = uid;
        res.appendChild(b);
      } catch (e) { res.replaceChildren(h("p", "ent-vazio", "Não foi possível procurar: " + erroAmigavel(e))); }
    }, 450);
  });
}

// ---------- criar o pedido ----------
async function criarPedido() {
  if (enviando) return;
  const m = MODALIDADES[S.mod];
  if (!S.origem || !S.destino || !m) return;
  if (distanciaKm(S.origem, S.destino) < 0.05) { toast("A saída e o destino estão no mesmo lugar."); return; }
  if (S.rota && S.rota.km > m.maxKm) { toast(`${m.nome}: até ${m.maxKm} km. Escolha outro veículo.`); return; }
  if (S.servico === "entrega" && S.oque.trim().length < 2) { toast("Diga o que vai na entrega."); $("entOque")?.focus(); return; }
  if (S.para && S.para.uid === eu.uid) { S.para = null; }
  enviando = true; atualizarBotao();
  const km = Math.round((S.rota?.km || kmPelaRua(S.origem, S.destino)) * 10) / 10;
  const min = Math.round(minutosDe(S.mod) || minutosAte(km, m.veiculo));
  const ref = fb.doc(fb.collection(fb.db, "corridas"));
  const pin = gerarPin();
  const pedido = {
    servico: S.servico, modalidade: S.mod, veiculo: m.veiculo,
    clienteId: eu.uid, clienteNome: String(dados.nome || "").slice(0, 80),
    origem: { lat: S.origem.lat, lng: S.origem.lng, nome: S.origem.nome || "", sub: S.origem.sub || "" },
    destino: { lat: S.destino.lat, lng: S.destino.lng, nome: S.destino.nome || "", sub: S.destino.sub || "" },
    km: Math.min(400, km), min: Math.min(900, min),
    valor: S.valor, valorSugerido: valorSugerido(S.mod, km, min),
    pagamento: S.pagamento,
    pacote: S.servico === "entrega" ? { tamanho: S.tamanho, oque: S.oque.trim().slice(0, 80) } : null,
    status: "procurando",
    paraId: S.para?.uid || "", destinatarioId: S.dest?.uid || "",
    geo4: geohash(S.origem.lat, S.origem.lng, 4), geo5: geohash(S.origem.lat, S.origem.lng, 5),
    raioKm: S.para ? 40 : RAIOS[0], pinEm: pinEm(S.servico),
    ...(S.presente ? { presenteId: S.presente.id, pagadorId: S.presente.de, pagamento: "presente" } : {}),
    criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
  };
  try {
    const lote = fb.writeBatch(fb.db);
    lote.set(ref, pedido);
    lote.set(fb.doc(fb.db, "corridas", ref.id, "privado", "pin"), { pin });
    if (S.presente) lote.update(fb.doc(fb.db, "presentes", S.presente.id), { status: "usado", corridaId: ref.id, usadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() });
    lote.set(fb.doc(fb.db, "corridas", ref.id, "privado", "contato"), { nome: S.contato.nome.trim().slice(0, 80), telefone: S.contato.telefone.trim().slice(0, 20), obs: S.contato.obs.trim().slice(0, 300) });
    await lote.commit();
  } catch (e) {
    enviando = false; atualizarBotao();
    toast(e?.code === "permission-denied" ? "Não foi possível pedir: confirme seu e-mail (e, se for a primeira vez, aguarde a liberação desta função)." : "Não foi possível pedir: " + erroAmigavel(e));
    return;
  }
  enviando = false;
  // Avisos pelo Mensagens: quem recebe acompanha; o entregador escolhido vê o chamado mesmo se estiver fora do painel.
  const cartao = { tipo: "entrega", id: ref.id, servico: S.servico, titulo: S.servico === "corrida" ? "Corrida" : `Entrega: ${S.oque.trim().slice(0, 60)}`, de: S.origem.nome.slice(0, 80), para: S.destino.nome.slice(0, 80) };
  if (S.dest) mandarMensagem(S.dest.uid, { tipoArquivo: "cartao", cartao: { ...cartao, papel: "destinatario" } }, "📦 Entrega a caminho de você").catch(() => {});
  if (S.presente) mandarMensagem(S.presente.de, { tipoArquivo: "cartao", cartao: { ...cartao, papel: "pagador", valor: S.valor } }, `🎁 Usou o seu presente: ${S.servico === "corrida" ? "corrida" : "entrega"}`).catch(() => {});
  if (S.para) mandarMensagem(S.para.uid, { tipoArquivo: "cartao", cartao: { ...cartao, papel: "entregador", valor: S.valor } }, S.servico === "corrida" ? "🚗 Chamado de corrida para você" : "📦 Chamado de entrega para você").catch(() => {});
  acompanhar(ref.id);
}

// =====================================================
// ACOMPANHAR
// =====================================================
let ultimoStatus = "", timerRaio = 0, papel = "";
function acompanhar(id) {
  vista = "acompanhar";
  clearInterval(timerPerto); timerPerto = 0;
  M?.tirarTodosMenos(["eu"]); M?.tirarRota(); M?.tirarRadar();
  try { history.replaceState(history.state, "", `entregas.html?id=${encodeURIComponent(id)}`); } catch {}
  pararPedido?.();
  ultimoStatus = ""; pinPedido = ""; notaEnt = null; fotoEnt = ""; rotaViva = null; atual = null;
  painel().replaceChildren(h("p", "ent-sub", "Carregando o pedido..."));
  pararPedido = fb.onSnapshot(fb.doc(fb.db, "corridas", id), (snap) => {
    if (!snap.exists()) { painel().replaceChildren(h("p", "ent-vazio", "Pedido não encontrado."), botao("Fazer um pedido", "ent-btn", () => novoPedido())); return; }
    const antes = atual;
    atual = { id: snap.id, ...snap.data() };
    papel = atual.clienteId === eu.uid ? "cliente" : atual.destinatarioId === eu.uid ? "destinatario" : atual.entregadorId === eu.uid ? "entregador" : atual.pagadorId === eu.uid ? "pagador" : "outro";
    if (papel === "entregador") { irPara("entregador.html"); return; }
    if (!pinPedido && (papel === "cliente" || papel === "destinatario")) fb.getDoc(fb.doc(fb.db, "corridas", id, "privado", "pin")).then((p) => { pinPedido = p.data()?.pin || ""; desenharPedido(); }).catch(() => {});
    if (atual.entregadorId && atual.entregadorId !== antes?.entregadorId) lerQuemLeva(atual.entregadorId);
    if (ultimoStatus && ultimoStatus !== atual.status) { avisarSom("status"); toast(textoStatus(atual)); }
    ultimoStatus = atual.status;
    desenharPedido();
  }, (e) => { painel().replaceChildren(h("p", "ent-vazio", e?.code === "permission-denied" ? "Você não tem acesso a este pedido." : "Sem conexão. Tentando de novo...")); });
  clearInterval(timerRaio);
  timerRaio = setInterval(() => { if (atual?.status === "procurando") { crescerRaio(); desenharPedido(); } else if (ATIVAS.includes(atual?.status)) atualizarEta(); }, 15000);
}
async function lerQuemLeva(uid) {
  try {
    const [n, p] = await Promise.all([fb.getDoc(fb.doc(fb.db, "entregadores_notas", uid)).catch(() => null), fb.getDoc(fb.doc(fb.db, "perfis_publicos", uid)).catch(() => null)]);
    notaEnt = n?.exists() ? n.data() : null;
    fotoEnt = p?.exists() ? p.data().fotoPerfil || "" : "";
    desenharPedido();
  } catch {}
}
// Ninguém aceitou: o raio cresce sozinho (5 → 10 → 20 → 40 km).
async function crescerRaio() {
  if (papel !== "cliente" || !atual || atual.status !== "procurando" || atual.paraId) return;
  const seg = (Date.now() - ms(atual.criadoEm)) / 1000;
  const alvo = seg > 240 ? 40 : seg > 150 ? 20 : seg > 60 ? 10 : 5;
  if (alvo > (atual.raioKm || 5)) { try { await fb.updateDoc(fb.doc(fb.db, "corridas", atual.id), { raioKm: alvo, atualizadoEm: fb.serverTimestamp() }); } catch {} }
}

function desenharPedido() {
  if (vista !== "acompanhar" || !atual) return;
  const c = atual;
  M?.marcar("origem", "origem", c.origem);
  M?.marcar("destino", "destino", c.destino);
  if (c.status === "procurando") return expirada(c) ? telaExpirada() : telaProcurando();
  if (ATIVAS.includes(c.status)) return telaAndamento();
  if (c.status === "concluida") return telaConcluida();
  return telaCancelada();
}

function resumoPedido(c) {
  const r = h("div", "ent-resumo");
  const lin = (a, b) => { const d = h("div"); d.append(h("span", null, a), h("b", null, b)); r.appendChild(d); };
  lin(c.servico === "corrida" ? "Partida" : "Coleta", c.origem?.nome || "");
  lin(c.servico === "corrida" ? "Destino" : "Entrega", c.destino?.nome || "");
  if (c.pacote) lin("O que vai", `${c.pacote.oque} (${TAMANHOS[c.pacote.tamanho]?.nome || ""})`);
  lin("Veículo", MODALIDADES[c.modalidade]?.nome || "");
  lin("Distância", `${textoKm(c.km || 0)} · ~${textoMin(c.min || 0)}`);
  lin("Oferta", `${reais(c.valor)} · ${c.pagamento === "pix" ? "Pix" : c.pagamento === "dinheiro" ? "Dinheiro" : c.pagamento === "presente" ? "Presente (paga quem deu)" : "Cartão"}`);
  return r;
}

function telaProcurando() {
  const c = atual, p = painel();
  topo(textoStatus(c), "", true);
  M?.tirarRota();
  M?.radar(c.origem, c.paraId ? 0.4 : (c.raioKm || 5));
  if (!M?._enquadrado) { M?.enquadrar([c.origem, c.destino], { baixo: innerWidth >= 900 ? 0 : 360 }); if (M) M._enquadrado = true; }
  if (vista === "acompanhar" && !timerPerto) { S.origem = c.origem; S.servico = c.servico; vigiarPertoProcurando(); }
  const seg = Math.max(0, Math.floor((Date.now() - ms(c.criadoEm)) / 1000));
  const box = h("div", "ent-busca");
  const radar = h("div", "radar"); radar.appendChild(veicIcone(c.veiculo));
  box.append(radar, h("h2", null, c.paraId ? "Chamando seu entregador" : textoStatus(c)));
  box.appendChild(h("p", null, c.paraId ? "Só a pessoa que você escolheu recebe este pedido." : `Procurando num raio de ${c.raioKm || 5} km · ${seg < 60 ? "agora há pouco" : `há ${Math.floor(seg / 60)} min`}`));
  const frag = document.createDocumentFragment();
  frag.appendChild(box);
  if (papel === "cliente") {
    if (seg > 75 && !c.paraId) {
      const n = h("div", "ent-nota alerta"); n.append(ic("alerta"), h("span", null, "Está demorando? Aumentar a oferta costuma ajudar alguém perto a aceitar."));
      frag.appendChild(n);
    }
    const ac = h("div", "ent-acoes");
    for (const add of [2, 5]) {
      const b = h("button", "ent-acao"); b.type = "button"; b.dataset.mais = String(add);
      b.append(h("b", null, `+ ${reais(add)}`), document.createTextNode(`Oferta: ${reais(c.valor + add)}`));
      b.addEventListener("click", async () => {
        try { await fb.updateDoc(fb.doc(fb.db, "corridas", c.id), { valor: Math.min(VALOR_MAX, c.valor + add), atualizadoEm: fb.serverTimestamp() }); toast("Oferta aumentada"); }
        catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
      });
      ac.appendChild(b);
    }
    frag.appendChild(ac);
  }
  if (papel === "destinatario") frag.appendChild(h("p", "ent-sub", `${c.clienteNome || "Alguém"} está enviando algo para você.`));
  frag.appendChild(resumoPedido(c));
  if (papel === "cliente") frag.appendChild(botao("Cancelar pedido", "ent-btn perigo", () => cancelar()));
  p.replaceChildren(frag);
}
function vigiarPertoProcurando() {
  clearInterval(timerPerto);
  const ler = async () => {
    if (atual?.status !== "procurando") { M?.nomes().filter((n) => n.startsWith("livre_")).forEach((n) => M.tirar(n)); return; }
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "entregadores_online"), fb.where("geo4", "in", vizinhos(atual.origem.lat, atual.origem.lng, 4)), fb.limit(80)));
      const limite = Date.now() - 3 * 60000;
      S.perto = s.docs.map((d) => d.data()).filter((x) => x.uid !== eu.uid && !x.ocupado && ms(x.em) > limite && x.veiculo === atual.veiculo && (!atual.paraId || x.uid === atual.paraId));
      S.para = null;
      desenharPerto();
    } catch {}
  };
  ler(); timerPerto = setInterval(ler, 30000);
}

function telaExpirada() {
  const c = atual, p = painel();
  topo("Ninguém aceitou", "", false);
  M?.tirarRadar();
  const box = h("div", "ent-fim");
  const i = h("div", "ok"); i.style.background = "var(--soft)"; i.style.color = "var(--muted)"; i.appendChild(ic("relogio"));
  box.append(i, h("h2", null, "Ninguém aceitou a tempo"), h("p", "ent-sub", "Pode ser que não tenha ninguém online perto agora. Tente de novo com uma oferta maior ou chame um entregador que você conhece."));
  const frag = document.createDocumentFragment();
  frag.append(box, resumoPedido(c));
  if (papel === "cliente") {
    frag.appendChild(botao("Pedir de novo", "ent-btn", async () => { await cancelarSilencioso("Ninguém aceitou a tempo"); pedirDeNovo(c, true); }));
    frag.appendChild(botao("Fechar pedido", "ent-btn sec", async () => { await cancelarSilencioso("Ninguém aceitou a tempo"); novoPedido(); }));
  }
  p.replaceChildren(frag);
}
async function cancelarSilencioso(motivo) {
  try { await fb.updateDoc(fb.doc(fb.db, "corridas", atual.id), { status: "cancelada", canceladaPor: "cliente", motivo, canceladaEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() }); } catch {}
}

// Andamento: o carrinho (ou a encomenda) anda no mapa com o GPS de quem leva.
function telaAndamento() {
  const c = atual, p = painel();
  clearInterval(timerPerto); timerPerto = 0;
  M?.tirarRadar(); M?.nomes().filter((n) => n.startsWith("livre_")).forEach((n) => M.tirar(n));
  const e = c.entregador || {};
  const corrida = c.servico === "corrida";
  // Marcador de quem leva: depois da coleta, na entrega, mostra a encomenda junto.
  if (c.pos && M) {
    const rotulo = c.status === "em_rota" && !corrida ? "📦" : "";
    if (M.posicao("leva")) M.mover("leva", c.pos, { rumo: c.pos.rumo });
    else M.marcar("leva", "veiculo", c.pos, { veiculo: c.veiculo, rumo: c.pos.rumo, rotulo });
    const el = document.querySelector(".mv-veic:not(.livre) em");
    if (rotulo && !el) { M.tirar("leva"); M.marcar("leva", "veiculo", c.pos, { veiculo: c.veiculo, rumo: c.pos.rumo, rotulo }); }
    if (!rotulo && el) { M.tirar("leva"); M.marcar("leva", "veiculo", c.pos, { veiculo: c.veiculo, rumo: c.pos.rumo }); }
  }
  atualizarRotaViva();
  topo(textoStatus(c), "", true);
  const frag = document.createDocumentFragment();
  const eta = h("div", "ent-eta");
  eta.append(h("h2", null, textoStatus(c)));
  const forte = h("strong"); forte.id = "entEta"; eta.appendChild(forte);
  frag.appendChild(eta);
  const sub = h("p", "ent-sub"); sub.id = "entEtaSub"; frag.appendChild(sub);
  // Etapas
  const ps = h("div", "ent-passos"), nomes = h("div", "ent-passos-nomes");
  const agora = passo(c.status);
  NOMES_ETAPA[corrida ? "corrida" : "entrega"].forEach((n, i) => { ps.appendChild(h("i", i < agora ? "feito" : i === agora ? "agora" : "")); nomes.appendChild(i === agora ? h("b", null, n) : h("span", null, n)); });
  frag.append(ps, nomes);
  // Quem leva
  const mot = h("div", "ent-motorista");
  const av = h("div", "avatar"); avatar(av, fotoEnt, e.nome);
  const tx = h("div");
  tx.append(h("b", null, e.nome || "Entregador"));
  const nota = notaEnt?.n ? `★ ${(notaEnt.soma / notaEnt.n).toFixed(1).replace(".", ",")} (${notaEnt.n})` : "Novo no Help Floripa";
  const sm = h("small"); const st = h("span", "ent-estrela", nota); sm.append(st, document.createTextNode(` · ${VEICULOS[e.veiculo]?.nome || ""}`)); tx.appendChild(sm);
  tx.appendChild(h("small", null, [e.modelo, e.cor].filter(Boolean).join(" · ")));
  mot.append(av, tx);
  if (e.placa) mot.appendChild(h("span", "ent-placa", formatarPlaca(e.placa)));
  frag.appendChild(mot);
  // PIN
  if (pinPedido && ((corrida && c.status !== "em_rota") || (!corrida))) {
    const pin = h("div", "ent-pin");
    const t = h("div");
    t.append(h("b", null, corrida ? "PIN para embarcar" : "PIN da entrega"),
      h("small", null, corrida ? `Diga este código a ${(e.nome || "quem leva").split(" ")[0]} quando entrar no carro. Confira a placa antes.`
        : papel === "destinatario" ? "Passe este código ao entregador quando receber a encomenda." : "Passe este código para quem vai receber: o entregador só finaliza com ele."));
    const n = h("strong", null, pinPedido); n.id = "entPin";
    pin.append(t, n);
    frag.appendChild(pin);
    if (!corrida && papel === "cliente" && !c.destinatarioId) {
      const b = botao("Enviar o PIN para quem recebe", "ent-btn sec", async () => {
        const t2 = `Sua encomenda (${c.pacote?.oque || "pedido"}) está a caminho pelo Help Floripa. Quando o entregador ${e.nome ? "(" + e.nome.split(" ")[0] + ") " : ""}chegar, passe este código: ${pinPedido}`;
        try { if (navigator.share) { await navigator.share({ text: t2 }); return; } } catch { return; }
        navigator.clipboard?.writeText(t2).then(() => toast("Mensagem copiada"), () => toast(t2));
      });
      frag.appendChild(b);
    }
  }
  if (c.pos && Date.now() - ms(c.pos.em) > 90000) frag.appendChild(h("div", "ent-gps", `Sem sinal do GPS de ${(e.nome || "quem leva").split(" ")[0]} há ${Math.round((Date.now() - ms(c.pos.em)) / 60000)} min (pode estar sem internet).`));
  if (!c.pos) frag.appendChild(h("div", "ent-gps", "Esperando a localização de quem leva..."));
  // Ações
  const ac = h("div", "ent-acoes");
  const acao = (icone, nome, fn, cls = "") => { const b = h("button", "ent-acao " + cls); b.type = "button"; b.append(["telefone", "escudo"].includes(icone) ? icExtra(icone) : ic(icone), document.createTextNode(nome)); b.addEventListener("click", fn); ac.appendChild(b); return b; };
  acao("chat", "Mensagem", () => abrirConversa(c.entregadorId));
  acao("telefone", "Ligar", () => ligarPara(c.entregadorId, e.nome));
  acao("escudo", "Segurança", () => abrirSeguranca(c));
  frag.appendChild(ac);
  frag.appendChild(resumoPedido(c));
  if (papel === "cliente" && c.status !== "em_rota") frag.appendChild(botao("Cancelar pedido", "ent-btn perigo", () => cancelar()));
  p.replaceChildren(frag);
  atualizarEta();
}
// Rota viva: de quem leva até a coleta (antes de coletar) ou até a entrega (depois). Recalcula de minuto em minuto.
async function atualizarRotaViva(forcar = false) {
  const c = atual; if (!c || !M) return;
  const alvo = c.status === "em_rota" ? c.destino : c.origem;
  const de = c.pos || (c.status === "em_rota" ? c.origem : null);
  if (!de) { M.desenharRota([[c.origem.lat, c.origem.lng], [c.destino.lat, c.destino.lng]]); return; }
  const chave = c.status;
  if (!forcar && rotaViva && rotaViva.chave === chave && Date.now() - rotaViva.em < 60000) return;
  rotaViva = { chave, em: Date.now(), pend: true, ...(rotaViva || {}) };
  const r = await buscarRota(de, alvo, c.veiculo);
  if (atual?.id !== c.id) return;
  rotaViva = { chave, em: Date.now(), r, de: { ...de }, alvo };
  M.desenharRota(r.pontos);
  if (!M._seguindo) { M.enquadrar([de, alvo], { baixo: innerWidth >= 900 ? 0 : painel().offsetHeight }); M._seguindo = chave; }
  else if (M._seguindo !== chave) { M.enquadrar([de, alvo], { baixo: innerWidth >= 900 ? 0 : painel().offsetHeight }); M._seguindo = chave; }
  atualizarEta();
}
function atualizarEta() {
  const c = atual; if (!c || !ATIVAS.includes(c.status)) return;
  const forte = $("entEta"), sub = $("entEtaSub"); if (!forte) return;
  if (c.status === "chegou") { forte.textContent = "Chegou"; sub.textContent = c.servico === "corrida" ? "Seu motorista está no local de partida." : "O entregador está no local da coleta."; return; }
  let min = 0;
  const r = rotaViva?.r;
  if (r && c.pos && rotaViva.de) {
    const total = distanciaKm(rotaViva.de, rotaViva.alvo) || 0.001;
    const falta = distanciaKm(c.pos, rotaViva.alvo);
    min = r.min * Math.min(1.5, falta / total);
  } else if (c.pos) min = minutosAte(kmPelaRua(c.pos, c.status === "em_rota" ? c.destino : c.origem), c.veiculo);
  if (rotaViva?.r && Date.now() - rotaViva.em > 60000) atualizarRotaViva(true);
  if (!min && !c.pos) { forte.textContent = ""; sub.textContent = ""; return; }
  const m = Math.max(1, Math.round(min));
  forte.textContent = `${m} min`;
  const chegada = new Date(Date.now() + m * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  sub.textContent = c.status === "em_rota" ? `${c.servico === "corrida" ? "Chegada ao destino" : "Entrega prevista"} às ${chegada}` : `${c.servico === "corrida" ? "Chega para te buscar" : "Chega na coleta"} às ${chegada}`;
}

function telaConcluida() {
  const c = atual, p = painel();
  topo(textoStatus(c), "", false);
  M?.tirarRota();
  if (c.pos) { M?.tirar("leva"); M?.marcar("leva", "pacote", c.destino); }
  const e = c.entregador || {};
  const box = h("div", "ent-fim");
  const i = h("div", "ok"); i.appendChild(ic("check")); box.appendChild(i);
  box.appendChild(h("h2", null, c.servico === "corrida" ? "Você chegou!" : papel === "destinatario" ? "Encomenda entregue" : "Entregue!"));
  const dur = ms(c.concluidaEm) && ms(c.aceitaEm) ? Math.round((ms(c.concluidaEm) - ms(c.aceitaEm)) / 60000) : 0;
  box.appendChild(h("p", "ent-sub", `${hora(c.concluidaEm)}${dur ? ` · ${textoMin(dur)} desde o aceite` : ""} · ${reais(c.valor)} (${c.pagamento === "presente" ? "presente" : PAGAMENTOS[c.pagamento] || ""})`));
  const frag = document.createDocumentFragment();
  frag.appendChild(box);
  if (papel === "cliente" && !c.avaliacao) frag.appendChild(blocoAvaliar(c));
  else if (c.avaliacao) frag.appendChild(h("p", "ent-sub", `Sua avaliação: ${"★".repeat(c.avaliacao.nota)}${"☆".repeat(5 - c.avaliacao.nota)}`));
  if (papel === "cliente" && c.entregadorId) frag.appendChild(botao(`Dar uma gorjeta para ${(e.nome || "quem levou").split(" ")[0]}`, "ent-btn sec", () => irPara(`presentes.html?gorjeta=${encodeURIComponent(c.id)}`)));
  if (papel === "pagador") frag.appendChild(h("p", "ent-sub", `Você deu esta ${c.servico} de presente: pague ${reais(c.valor)} direto para ${(e.nome || "quem levou").split(" ")[0]}.`));
  if (papel === "cliente" && c.entregadorId) {
    const fav = (dados.entregadoresFavoritos || []).includes(c.entregadorId);
    const b = botao(fav ? `${(e.nome || "").split(" ")[0]} está nos seus favoritos` : `Salvar ${(e.nome || "").split(" ")[0] || "entregador"} nos favoritos`, "ent-btn sec", async () => {
      if (fav) return;
      try {
        await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { entregadoresFavoritos: fb.arrayUnion(c.entregadorId) }, { merge: true });
        dados.entregadoresFavoritos = [...(dados.entregadoresFavoritos || []), c.entregadorId];
        toast("Salvo: da próxima vez você chama direto");
        telaConcluida();
      } catch (er) { toast("Não foi possível salvar: " + erroAmigavel(er)); }
    });
    frag.appendChild(b);
  }
  frag.appendChild(resumoPedido(c));
  if (papel === "cliente") {
    frag.appendChild(botao("Pedir de novo", "ent-btn", () => pedirDeNovo(c)));
    frag.appendChild(botao("Novo pedido", "ent-btn sec", () => novoPedido()));
  }
  p.replaceChildren(frag);
}
function blocoAvaliar(c) {
  const box = h("div");
  box.appendChild(h("h3", null, `Como foi com ${(c.entregador?.nome || "quem levou").split(" ")[0]}?`));
  let nota = 0; const elogios = new Set();
  const est = h("div", "ent-estrelas");
  for (let i = 1; i <= 5; i++) {
    const b = h("button"); b.type = "button"; b.setAttribute("aria-label", `${i} estrela${i > 1 ? "s" : ""}`); b.dataset.nota = String(i);
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
    b.addEventListener("click", () => { nota = i; est.querySelectorAll("button").forEach((x, k) => x.classList.toggle("on", k < i)); enviar.disabled = false; });
    est.appendChild(b);
  }
  box.appendChild(est);
  const chips = h("div", "ent-chips");
  ELOGIOS[c.servico === "corrida" ? "corrida" : "entrega"].forEach((t) => {
    const b = h("button", "ent-chip", t); b.type = "button"; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { if (elogios.has(t)) elogios.delete(t); else elogios.add(t); b.setAttribute("aria-pressed", String(elogios.has(t))); });
    chips.appendChild(b);
  });
  box.appendChild(chips);
  let texto = "";
  box.appendChild(campo("Comentário (opcional)", "textarea", "", (v) => (texto = v), 300));
  const enviar = botao("Enviar avaliação", "ent-btn", async () => {
    if (!nota) return;
    enviar.disabled = true; enviar.textContent = "Enviando...";
    try {
      const refC = fb.doc(fb.db, "corridas", c.id), refN = fb.doc(fb.db, "entregadores_notas", c.entregadorId);
      await fb.runTransaction(fb.db, async (tx) => {
        const n = await tx.get(refN);
        const atualN = n.exists() ? n.data() : null;
        tx.update(refC, { avaliacao: { nota, elogios: [...elogios].slice(0, 5), texto: texto.trim().slice(0, 300), em: fb.serverTimestamp() } });
        if (atualN) tx.update(refN, { soma: (atualN.soma || 0) + nota, n: (atualN.n || 0) + 1, ultima: c.id });
        else tx.set(refN, { soma: nota, n: 1, ultima: c.id });
      });
      toast("Obrigado pela avaliação!");
    } catch (e) { enviar.disabled = false; enviar.textContent = "Enviar avaliação"; toast("Não foi possível enviar: " + erroAmigavel(e)); }
  });
  enviar.disabled = true;
  box.appendChild(enviar);
  return box;
}
function telaCancelada() {
  const c = atual, p = painel();
  topo("Pedido cancelado", "", false);
  M?.tirarRota(); M?.tirarRadar(); M?.tirar("leva");
  const box = h("div", "ent-fim");
  const i = h("div", "ok"); i.style.background = "color-mix(in srgb, var(--danger) 14%, transparent)"; i.style.color = "var(--danger)"; i.appendChild(ic("fechar"));
  box.append(i, h("h2", null, "Pedido cancelado"), h("p", "ent-sub", `${c.canceladaPor === "entregador" ? "Cancelado por quem ia levar" : "Cancelado"}${c.motivo ? ": " + c.motivo : ""}.`));
  const frag = document.createDocumentFragment();
  frag.append(box, resumoPedido(c));
  if (papel === "cliente") frag.append(botao("Pedir de novo", "ent-btn", () => pedirDeNovo(c)), botao("Novo pedido", "ent-btn sec", () => novoPedido()));
  p.replaceChildren(frag);
}

function cancelar() {
  const c = atual;
  const { corpo, fechar } = abrirTela("Cancelar pedido");
  corpo.appendChild(h("p", "ent-sub", c.status === "chegou" ? `${(c.entregador?.nome || "Quem leva").split(" ")[0]} já chegou. Se cancelar agora, avise pelo chat: ele foi até aí.` : "Por que você quer cancelar?"));
  let motivo = "";
  const chips = h("div", "ent-chips");
  MOTIVOS_CANCELAR.forEach((m) => {
    const b = h("button", "ent-chip", m); b.type = "button"; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { motivo = m; chips.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); ok.disabled = false; });
    chips.appendChild(b);
  });
  corpo.appendChild(chips);
  const ok = botao("Cancelar o pedido", "ent-btn perigo", async () => {
    ok.disabled = true;
    try {
      await fb.updateDoc(fb.doc(fb.db, "corridas", c.id), { status: "cancelada", canceladaPor: "cliente", motivo, canceladaEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() });
      fechar();
    } catch (e) { ok.disabled = false; toast("Não foi possível cancelar: " + erroAmigavel(e)); }
  });
  ok.disabled = true;
  corpo.append(ok, botao("Voltar", "ent-btn sec", fechar));
}
function abrirSeguranca(c) {
  const { corpo } = abrirTela("Segurança");
  const e = c.entregador || {};
  const txt = `${c.servico === "corrida" ? "Estou numa corrida" : "Tenho uma entrega"} pelo Help Floripa com ${e.nome || "?"}${e.placa ? ` (placa ${formatarPlaca(e.placa)}, ${[e.modelo, e.cor].filter(Boolean).join(" ")})` : ""}, de ${c.origem?.nome || "?"} para ${c.destino?.nome || "?"}.`;
  corpo.appendChild(h("p", "ent-sub", "Confira sempre o nome, a foto e a placa antes de entrar no carro ou entregar algo."));
  const item = (icone, titulo, sub, fn) => { const b = h("button", "ent-res"); b.type = "button"; const i = h("span", "ic"); i.appendChild(ic(icone)); const t = h("span"); t.append(h("b", null, titulo), h("small", null, sub)); b.append(i, t); b.addEventListener("click", fn); corpo.appendChild(b); };
  item("compartilhar", "Compartilhar com alguém", "Manda quem está levando, a placa e o trajeto", async () => {
    try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch { return; }
    navigator.clipboard?.writeText(txt).then(() => toast("Copiado"), () => toast(txt));
  });
  item("alerta", "Ligar para a polícia (190)", "Em caso de emergência", () => { location.href = "tel:190"; });
  item("ajuda", "Central de Segurança", "Dicas, golpes e como denunciar", () => irPara("seguranca.html"));
}
async function abrirConversa(uid) {
  if (!uid) return;
  try {
    const id = await garantirConversa(fb, eu.uid, uid);
    const m = await import("./chat-gaveta.js?v=4");
    m.abrirChat(`mensagens.html?conversa=${encodeURIComponent(id)}`);
  } catch (e) { toast("Não foi possível abrir a conversa: " + erroAmigavel(e)); }
}
async function ligarPara(uid, nome) {
  if (!uid) return;
  try {
    const conv = await garantirConversa(fb, eu.uid, uid);
    ligar({ para: uid, nome: nome || "", foto: fotoEnt || "", conv, tipo: "audio" });
  } catch (e) { toast("Não foi possível ligar: " + erroAmigavel(e)); }
}

function pedirDeNovo(c, aumentar = false) {
  pararPedido?.(); pararPedido = null; clearInterval(timerRaio);
  S.servico = c.servico; S.mod = c.modalidade;
  S.origem = { ...c.origem }; S.destino = { ...c.destino };
  S.valor = aumentar ? Math.min(VALOR_MAX, Math.round(c.valor * 1.15 * 2) / 2) : c.valor; S.valorMexido = true;
  S.pagamento = c.pagamento || "pix";
  if (c.pacote) { S.tamanho = c.pacote.tamanho; S.oque = c.pacote.oque; }
  S.para = null; S.rota = null; atual = null;
  M?.tirar("leva"); if (M) { M._enquadrado = false; M._seguindo = null; }
  try { history.replaceState(history.state, "", "entregas.html"); } catch {}
  mostrarPedir();
}
function novoPedido() {
  pararPedido?.(); pararPedido = null; clearInterval(timerRaio);
  S.destino = null; S.rota = null; S.oque = ""; S.valorMexido = false; S.para = null; atual = null;
  if (S.minha) S.origem = { lat: S.minha.lat, lng: S.minha.lng, nome: "Minha localização", sub: "" };
  M?.tirar("leva"); if (M) { M._enquadrado = false; M._seguindo = null; }
  try { history.replaceState(history.state, "", "entregas.html"); } catch {}
  mostrarPedir();
}

// ---------- histórico ----------
async function abrirHistorico() {
  const { corpo, fechar } = abrirTela("Seus pedidos");
  corpo.appendChild(h("p", "ent-vazio", "Carregando..."));
  const ler = async (campoUid) => {
    const col = fb.collection(fb.db, "corridas");
    try { return (await fb.getDocs(fb.query(col, fb.where(campoUid, "==", eu.uid), fb.orderBy("criadoEm", "desc"), fb.limit(30)))).docs; }
    catch { try { return (await fb.getDocs(fb.query(col, fb.where(campoUid, "==", eu.uid), fb.limit(60)))).docs; } catch { return []; } }
  };
  const [meus, paraMim] = await Promise.all([ler("clienteId"), ler("destinatarioId")]);
  const lista = [...meus, ...paraMim].map((d) => ({ id: d.id, ...d.data() }))
    .filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i)
    .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  corpo.replaceChildren();
  corpo.appendChild(botao("Novo pedido", "ent-btn", () => { fechar(); if (vista !== "pedir") novoPedido(); }));
  if (!lista.length) { corpo.appendChild(h("p", "ent-vazio", "Você ainda não fez entregas nem corridas.")); return; }
  const l = h("div", "ent-lista"); l.style.marginTop = "12px";
  lista.forEach((c) => {
    const b = h("button", "ent-item"); b.type = "button";
    const lin = h("div", "lin");
    const t = h("span"); t.append(h("b", null, c.servico === "corrida" ? "Corrida" : c.pacote?.oque ? `Entrega: ${c.pacote.oque}` : "Entrega"), h("br"), h("small", null, `${dataCurta(c.criadoEm)}${c.destinatarioId === eu.uid ? " · para você" : ""}`));
    const cor = c.status === "concluida" ? "verde" : c.status === "cancelada" || expirada(c) ? "vermelho" : "ciano";
    const v = h("span"); v.style.textAlign = "right"; v.append(h("span", "valor", reais(c.valor)), h("br"), h("span", "ent-etq " + cor, textoStatus(c)));
    lin.append(t, v);
    const end = h("div", "end"); end.append(h("i"), h("span", null, c.origem?.nome || ""), h("i", "b"), h("span", null, c.destino?.nome || ""));
    b.append(lin, end);
    b.addEventListener("click", () => { fechar(); acompanhar(c.id); });
    l.appendChild(b);
  });
  corpo.appendChild(l);
}
