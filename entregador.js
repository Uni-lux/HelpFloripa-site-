// =====================================================
// Painel do entregador / motorista (entregador.html)
// Cadastro (conta verificada, veículo, placa, CNH e declarações), ficar online (GPS), pedidos perto com som
// (os chamados direto para a pessoa vêm primeiro), aceitar (só um aceita: transação), rota até a coleta e até a
// entrega, navegar no Google Maps/Waze, etapas com PIN, desistir, ganhos do dia e avaliação de quem pediu.
// A posição vai para o pedido a cada poucos segundos: é ela que move o carrinho no mapa de quem pediu.
// Parâmetros: ?convite=NICK (quem convidou), ?pedido=ID (abrir um chamado vindo do Mensagens).
// =====================================================
import { $, toast, erroAmigavel, fb, eu, dados, iniciarRede } from "./rede.js?v=154";
import { confirmarHF } from "./confirmar.js?v=6";
import { ligar } from "./chamadas.js?v=8";
import { criarMapa, buscarRota, linkNavegar } from "./mapa-vivo.js?v=2";
import {
  SERVICOS, VEICULOS, MODALIDADES, TAMANHOS, ATIVAS, NOMES_ETAPA, CNH,
  textoStatus, passo, expirada, distanciaKm, kmPelaRua, minutosAte, geohash, vizinhos, noBrasil, reais, textoKm, textoMin,
  normalizarPlaca, placaOk, formatarPlaca, cnhServe, fazCorrida, notaPedido
} from "./corridas-base.js?v=1";
import { h, ic, icExtra, veicIcone, botao, ms, hora, dataCurta, textoVeiculo, avatar, avisarSom, garantirConversa, irPara, abrirTela } from "./entregas-comum.js?v=4";

const params = new URLSearchParams(location.search);
let M = null, cad = null, online = false, pos = null, vigia = null, trava = null;
let pedidos = new Map(), vistos = new Set(), pararLista = [], pararAtivo = null, trabalho = null, celulaAtual = "";
let ultimaOnline = 0, ultimaPosOnline = null, ultimaPos = 0, ultimaPosEnviada = null, rotaJob = null, enviandoPos = false;
const painel = () => $("painel");

(async () => {
  try { await iniciarRede(); }
  catch (e) { painel().replaceChildren(h("p", "ent-sub", e.message || "Entre na sua conta.")); return; }
  try { M = await criarMapa($("mapa")); } catch { $("mapa").classList.add("sem-mapa"); }
  $("btVoltar").addEventListener("click", () => { if (history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) history.back(); else irPara("index.html"); });
  $("btHistorico").addEventListener("click", () => irPara("entregas.html"));
  $("btMinhaPos").addEventListener("click", () => { if (pos) M?.irPara(pos, 16); else pedirGps(); });
  const p = painel(); if ("ResizeObserver" in window) new ResizeObserver(() => document.documentElement.style.setProperty("--painel-h", p.offsetHeight + "px")).observe(p);
  await lerCadastro();
  if (!cad) { telaCadastro(); return; }
  ouvirTrabalho();
  ouvirDiretos();
  telaPainel();
  addEventListener("pagehide", () => { if (online && !trabalho) fb.deleteDoc(fb.doc(fb.db, "entregadores_online", eu.uid)).catch(() => {}); });
})();

async function lerCadastro() {
  try { const s = await fb.getDoc(fb.doc(fb.db, "entregadores", eu.uid)); cad = s.exists() ? s.data() : null; }
  catch { cad = null; }
}
function topo(t, sub = "", on = online) { $("tituloTopo").textContent = t; $("subTopo").textContent = sub; $("pontoTopo").classList.toggle("off", !on); }

// =====================================================
// CADASTRO
// =====================================================
async function telaCadastro(editar = false) {
  topo(editar ? "Seu cadastro" : "Seja entregador", "", false);
  const p = painel(), frag = document.createDocumentFragment();
  if (!editar) {
    const convite = String(params.get("convite") || "").replace(/[^a-z0-9._]/gi, "").slice(0, 30);
    if (convite) { const c = h("div", "eg-convite"); c.append(ic("pessoa"), h("span", null, `@${convite} te convidou para fazer entregas e corridas pelo Help Floripa.`)); frag.appendChild(c); }
    const hero = h("div", "eg-hero");
    hero.append(h("h2", null, "Faça entregas e corridas"), h("p", "ent-sub", "Fique online quando quiser, aceite os pedidos perto de você e siga a rota no mapa. Você combina e recebe direto de quem pediu."));
    const ul = h("ul", "eg-lista-ben");
    [["relogio", "Seu horário: online e offline com um toque."], ["local", "Pedidos perto de você, com distância e valor antes de aceitar."], ["pessoa", "Clientes que já te conhecem podem te chamar direto pelo seu @."], ["cadeado", "Quem pede e quem leva têm conta verificada; PIN na entrega e no embarque."]]
      .forEach(([i, t]) => { const li = h("li"); li.append(ic(i), h("span", null, t)); ul.appendChild(li); });
    hero.appendChild(ul);
    frag.appendChild(hero);
  }
  // Conta verificada (selo) é obrigatória para levar pessoas e encomendas.
  if (!dados.verificado && !cad) {
    const n = h("div", "ent-nota alerta"); n.append(ic("alerta"), h("span", null, "Para fazer entregas e corridas, sua conta precisa ser verificada (documento com foto e selfie). A equipe confere e libera."));
    frag.append(n, botao("Verificar minha conta", "ent-btn", async () => { const m = await import("./verificacao.js?v=111"); m.abrirVerificacao({ aoMudar: () => location.reload() }); }));
    frag.appendChild(botao("Pedir uma entrega", "ent-btn sec", () => irPara("entregas.html")));
    p.replaceChildren(frag);
    return;
  }
  const f = { servicos: new Set(cad?.servicos || ["entrega"]), veiculo: cad?.veiculo || "moto", modelo: cad?.modelo || "", cor: cad?.cor || "", placa: cad?.placa || "", cnh: cad?.cnh || "", declaracoes: { ...(cad?.declaracoes || {}) } };
  const form = h("div");
  const desenhar = () => {
    form.replaceChildren();
    form.appendChild(h("h3", null, "O que você quer fazer"));
    const sv = h("div", "ent-chips");
    for (const [k, nome] of [["entrega", "Entregas"], ["corrida", "Corridas (passageiros)"]]) {
      const b = h("button", "ent-chip", nome); b.type = "button"; b.dataset.servico = k; b.setAttribute("aria-pressed", String(f.servicos.has(k)));
      b.disabled = k === "corrida" && !fazCorrida(f.veiculo);
      b.addEventListener("click", () => { if (f.servicos.has(k) && f.servicos.size > 1) f.servicos.delete(k); else f.servicos.add(k); desenhar(); });
      sv.appendChild(b);
    }
    form.appendChild(sv);
    form.appendChild(h("h3", null, "Seu veículo"));
    const vs = h("div", "ent-ops");
    for (const [k, v] of Object.entries(VEICULOS)) {
      const b = h("button", "ent-op"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(f.veiculo === k)); b.dataset.veiculo = k;
      const icb = h("span", "ic"); icb.appendChild(veicIcone(k));
      const tx = h("span"); tx.append(h("b", null, v.nome), h("small", null, k === "bike" ? "Só entregas pequenas, sem placa" : k === "utilitario" ? "Fretes e volumes grandes" : fazCorrida(k) ? "Entregas e corridas" : ""));
      b.append(icb, tx, h("span"));
      b.addEventListener("click", () => { f.veiculo = k; if (!fazCorrida(k)) { f.servicos.delete("corrida"); f.servicos.add("entrega"); } desenhar(); });
      vs.appendChild(b);
    }
    form.appendChild(vs);
    if (f.veiculo !== "bike") {
      const d = h("div", "ent-duplo");
      d.append(campo("Modelo (ex.: Honda CG 160)", f.modelo, (v) => (f.modelo = v), 40, "egModelo"), campo("Cor", f.cor, (v) => (f.cor = v), 20, "egCor"));
      form.appendChild(d);
      const d2 = h("div", "ent-duplo");
      const pl = campo("Placa", f.placa ? formatarPlaca(f.placa) : "", (v) => (f.placa = normalizarPlaca(v)), 8, "egPlaca");
      pl.querySelector("input").style.textTransform = "uppercase"; pl.querySelector("input").autocapitalize = "characters";
      const cnhL = h("label", "ent-campo"); cnhL.appendChild(h("span", null, "Categoria da CNH"));
      const sel = h("select"); sel.id = "egCnh"; sel.dataset.nativo = "";
      sel.appendChild(new Option("Escolha", ""));
      CNH.forEach((c) => sel.appendChild(new Option(c, c, false, f.cnh === c)));
      sel.addEventListener("change", () => (f.cnh = sel.value));
      cnhL.appendChild(sel);
      d2.append(pl, cnhL);
      form.appendChild(d2);
    } else {
      form.appendChild(campo("Modelo e cor da bike (opcional)", f.modelo, (v) => (f.modelo = v), 40, "egModelo"));
    }
    form.appendChild(h("h3", null, "Declarações"));
    const decl = [
      ["maior", "Tenho 18 anos ou mais."],
      ["documentos", f.veiculo === "bike" ? "Estou em condições de pedalar com segurança e uso equipamentos de proteção." : `Tenho CNH válida para ${VEICULOS[f.veiculo].nome.toLowerCase()} e o veículo está com a documentação em dia.${f.servicos.has("corrida") ? " Para corridas, minha CNH tem a observação EAR (exerce atividade remunerada)." : ""}`],
      ["autonomo", "Trabalho por conta própria: o Help Floripa só conecta quem pede e quem leva, sem vínculo de emprego. Sigo as leis de trânsito e as Diretrizes da Comunidade."]
    ];
    decl.forEach(([k, t]) => {
      const l = h("label", "ent-check"); const i = h("input"); i.type = "checkbox"; i.checked = !!f.declaracoes[k]; i.dataset.decl = k;
      i.addEventListener("change", () => (f.declaracoes[k] = i.checked));
      l.append(i, h("span", null, t)); form.appendChild(l);
    });
    const salvar = botao(editar ? "Salvar cadastro" : "Ativar meu cadastro", "ent-btn", () => gravarCadastro(f, salvar));
    salvar.id = "egSalvar";
    form.appendChild(salvar);
    if (editar) {
      form.appendChild(botao("Voltar", "ent-btn sec", () => telaPainel()));
      form.appendChild(botao("Apagar meu cadastro de entregador", "ent-btn perigo", () => confirmarHF({ titulo: "Apagar o cadastro?", texto: "Você deixa de receber pedidos. Pode se cadastrar de novo quando quiser.", ok: "Apagar", icone: "lixo", aoConfirmar: async () => { await ficarOffline(); await fb.deleteDoc(fb.doc(fb.db, "entregadores", eu.uid)); cad = null; telaCadastro(); } })));
    }
  };
  desenhar();
  frag.appendChild(form);
  p.replaceChildren(frag);
}
function campo(rotulo, valor, aoMudar, max, id) {
  const l = h("label", "ent-campo"); l.appendChild(h("span", null, rotulo));
  const i = h("input"); i.type = "text"; i.value = valor || ""; i.maxLength = max; if (id) i.id = id;
  i.addEventListener("input", () => aoMudar(i.value));
  l.appendChild(i); return l;
}
async function gravarCadastro(f, botaoSalvar) {
  const bike = f.veiculo === "bike";
  if (!bike && f.modelo.trim().length < 2) { toast("Diga o modelo do veículo."); return; }
  if (!bike && !placaOk(f.placa)) { toast("Placa inválida. Use o formato ABC1D23 ou ABC1234."); $("egPlaca")?.focus(); return; }
  if (!bike && !cnhServe(f.cnh, f.veiculo)) { toast(`A categoria da CNH não serve para ${VEICULOS[f.veiculo].nome.toLowerCase()}.`); return; }
  if (!f.declaracoes.maior || !f.declaracoes.documentos || !f.declaracoes.autonomo) { toast("Marque as três declarações para continuar."); return; }
  const servicos = [...f.servicos].filter((s) => s === "entrega" || (s === "corrida" && fazCorrida(f.veiculo)));
  const doc = {
    uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), servicos: servicos.length ? servicos : ["entrega"],
    veiculo: f.veiculo, modelo: f.modelo.trim().slice(0, 40), cor: bike ? "" : f.cor.trim().slice(0, 20),
    placa: bike ? "" : normalizarPlaca(f.placa), cnh: bike ? "" : f.cnh,
    cidade: String(dados.cidade || "").slice(0, 60), uf: /^[A-Z]{2}$/.test(dados.uf || "") ? dados.uf : "",
    declaracoes: { maior: true, documentos: true, autonomo: true },
    status: cad?.status === "pausado" ? "pausado" : "ativo",
    criadoEm: cad?.criadoEm || fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
  };
  if (cad?.suspensoMotivo) doc.suspensoMotivo = cad.suspensoMotivo;
  botaoSalvar.disabled = true;
  try {
    await fb.setDoc(fb.doc(fb.db, "entregadores", eu.uid), doc);
    await lerCadastro();
    toast(cad ? "Cadastro salvo" : "Pronto!");
    ouvirTrabalho(); ouvirDiretos(); telaPainel();
  } catch (e) {
    botaoSalvar.disabled = false;
    toast(e?.code === "permission-denied" ? "Não foi possível ativar: confira se sua conta está verificada e o e-mail confirmado (e, se for a primeira vez, aguarde a liberação desta função)." : "Não foi possível salvar: " + erroAmigavel(e));
  }
}

// =====================================================
// PAINEL (online/offline e pedidos perto)
// =====================================================
async function telaPainel() {
  if (trabalho) return telaTrabalho();
  topo(online ? "Online" : "Offline", online ? "recebendo pedidos" : "", online);
  const p = painel(), frag = document.createDocumentFragment();
  if (cad.status === "suspenso") {
    const n = h("div", "ent-nota alerta"); n.append(ic("alerta"), h("span", null, `Seu cadastro de entregador está suspenso pela equipe${cad.suspensoMotivo ? ": " + cad.suspensoMotivo : "."} Fale com o suporte para saber mais.`));
    frag.append(n, botao("Falar com o suporte", "ent-btn sec", () => irPara("suporte.html")));
    p.replaceChildren(frag); return;
  }
  const box = h("div", "eg-online");
  const tx = h("span");
  tx.append(h("b", null, online ? "Você está online" : "Você está offline"), h("small", null, online ? "Mantenha esta tela aberta: os pedidos perto aparecem aqui com som." : `${textoVeiculo(cad)} · ${cad.servicos.map((s) => SERVICOS[s].nome.toLowerCase() + "s").join(" e ")}`));
  const chave = h("button", "eg-chave"); chave.type = "button"; chave.id = "egOnline"; chave.setAttribute("role", "switch"); chave.setAttribute("aria-checked", String(online)); chave.setAttribute("aria-label", "Ficar online");
  chave.addEventListener("click", () => (online ? ficarOffline() : ficarOnline()));
  box.append(veicIcone(cad.veiculo), tx, chave);
  frag.appendChild(box);
  const nums = h("div", "eg-numeros"); nums.id = "egNumeros";
  frag.appendChild(nums);
  pintarGanhos(nums);
  const lista = h("div", "ent-lista"); lista.id = "egPedidos";
  frag.appendChild(h("h3", null, "Pedidos perto de você"));
  frag.appendChild(lista);
  const ac = h("div", "ent-acoes");
  const a = (icone, nome, fn) => { const b = h("button", "ent-acao"); b.type = "button"; b.append(ic(icone), document.createTextNode(nome)); b.addEventListener("click", fn); ac.appendChild(b); };
  a("compartilhar", "Divulgar meu @", divulgar);
  a("relogio", "Histórico", abrirHistorico);
  a("config", "Cadastro", () => telaCadastro(true));
  frag.appendChild(ac);
  p.replaceChildren(frag);
  pintarPedidos();
}
async function pintarGanhos(alvo) {
  try {
    const [s, n] = await Promise.all([
      fb.getDocs(fb.query(fb.collection(fb.db, "corridas"), fb.where("entregadorId", "==", eu.uid), fb.where("status", "==", "concluida"), fb.limit(200))),
      fb.getDoc(fb.doc(fb.db, "entregadores_notas", eu.uid)).catch(() => null)
    ]);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const deHoje = s.docs.map((d) => d.data()).filter((c) => ms(c.concluidaEm) >= hoje.getTime());
    const nota = n?.exists() && n.data().n ? (n.data().soma / n.data().n).toFixed(1).replace(".", ",") : "—";
    alvo.replaceChildren();
    [[reais(deHoje.reduce((t, c) => t + (Number(c.valor) || 0), 0)), "Hoje"], [String(deHoje.length), deHoje.length === 1 ? "Pedido hoje" : "Pedidos hoje"], [`★ ${nota}`, `${n?.data()?.n || 0} avaliações`]]
      .forEach(([b, sm]) => { const d = h("div"); d.append(h("b", null, b), h("small", null, sm)); alvo.appendChild(d); });
  } catch { alvo.replaceChildren(); }
}

async function ficarOnline() {
  if (cad.status !== "ativo") {
    try { await fb.updateDoc(fb.doc(fb.db, "entregadores", eu.uid), { status: "ativo", atualizadoEm: fb.serverTimestamp() }); cad.status = "ativo"; } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); return; }
  }
  const ok = await pedirGps();
  if (!ok) { toast("Para ficar online, permita a localização do aparelho."); return; }
  online = true;
  try { trava = await navigator.wakeLock?.request("screen"); } catch {}
  avisarSom("status");
  await enviarPresenca(true);
  ouvirPedidos();
  telaPainel();
}
async function ficarOffline() {
  online = false;
  pararLista.forEach((f) => f()); pararLista = []; celulaAtual = "";
  for (const [k, c] of pedidos) if (c._fonte === "perto") pedidos.delete(k);
  try { await trava?.release(); } catch {} trava = null;
  if (!trabalho) { if (vigia != null) { navigator.geolocation.clearWatch(vigia); vigia = null; } }
  try { await fb.deleteDoc(fb.doc(fb.db, "entregadores_online", eu.uid)); } catch {}
  M?.nomes().filter((n) => n.startsWith("ped_")).forEach((n) => M.tirar(n));
  if (!trabalho) telaPainel();
}
document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible" && online && !trava) { try { trava = await navigator.wakeLock?.request("screen"); } catch {} } });

// GPS contínuo: posição na tela, presença online e (com pedido) a posição ao vivo no pedido.
function pedirGps() {
  return new Promise((ok) => {
    if (!navigator.geolocation) { ok(false); return; }
    if (vigia != null) { ok(!!pos); if (pos) return; }
    let respondeu = false;
    vigia = navigator.geolocation.watchPosition((p) => {
      const novo = { lat: p.coords.latitude, lng: p.coords.longitude, rumo: Number.isFinite(p.coords.heading) ? p.coords.heading : null, vel: Number.isFinite(p.coords.speed) ? p.coords.speed : null };
      if (!noBrasil(novo)) return;
      const primeiro = !pos;
      pos = novo;
      if (M) {
        if (M.posicao("eu")) M.mover("eu", pos, { ms: 900, rumo: pos.rumo ?? undefined }); else M.marcar("eu", "veiculo", pos, { veiculo: cad?.veiculo || "moto", rumo: pos.rumo || 0 });
        if (primeiro) M.irPara(pos, 15);
      }
      if (!respondeu) { respondeu = true; ok(true); }
      aoMover();
    }, () => { if (!respondeu) { respondeu = true; ok(false); } }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
  });
}
function aoMover() {
  if (online) {
    enviarPresenca();
    const cel = geohash(pos.lat, pos.lng, 4);
    if (cel !== celulaAtual) ouvirPedidos();
    if (!trabalho) pintarPedidos();
  }
  if (trabalho) { enviarPosicao(); desenharTrabalhoNoMapa(); atualizarEtaJob(); }
}
// Presença: a cada 30 s ou 150 m (posição arredondada, ~100 m).
async function enviarPresenca(forcar = false) {
  if (!pos || !online) return;
  const agora = Date.now();
  if (!forcar && agora - ultimaOnline < 30000 && ultimaPosOnline && distanciaKm(ultimaPosOnline, pos) < 0.15) return;
  ultimaOnline = agora; ultimaPosOnline = { ...pos };
  const lat = Math.round(pos.lat * 1000) / 1000, lng = Math.round(pos.lng * 1000) / 1000;
  try {
    await fb.setDoc(fb.doc(fb.db, "entregadores_online", eu.uid), { uid: eu.uid, lat, lng, geo4: geohash(lat, lng, 4), geo5: geohash(lat, lng, 5), veiculo: cad.veiculo, servicos: cad.servicos, ocupado: !!trabalho, em: fb.serverTimestamp() });
  } catch {}
}
setInterval(() => { if (online) enviarPresenca(true); }, 60000);

// Chamados direto para a pessoa (clientes que já conhecem ela): chegam mesmo offline (o cartão também vai pelo Mensagens).
let pararDireto = null, avisouErro = false;
function ouvirDiretos() {
  pararDireto?.();
  pararDireto = fb.onSnapshot(fb.query(fb.collection(fb.db, "corridas"), fb.where("status", "==", "procurando"), fb.where("paraId", "==", eu.uid), fb.limit(20)), (s) => {
    for (const ch of s.docChanges()) {
      if (ch.type === "removed") pedidos.delete(ch.doc.id);
      else pedidos.set(ch.doc.id, { id: ch.doc.id, ...ch.doc.data(), _fonte: "direto" });
    }
    pintarPedidos(true);
  }, erroLista);
}
function erroLista(e) {
  if (avisouErro) return; avisouErro = true;
  console.warn("[Entregas]", e?.code || e);
  toast(e?.code === "failed-precondition" ? "A lista de pedidos ainda está sendo preparada pela equipe. Tente de novo em alguns minutos." : "Não foi possível ler os pedidos agora.");
}
// Pedidos perto: os públicos da região (célula geohash ~40 km e as vizinhas) e os chamados direto para a pessoa.
function ouvirPedidos() {
  if (!pos) return;
  pararLista.forEach((f) => f()); pararLista = [];
  celulaAtual = geohash(pos.lat, pos.lng, 4);
  const col = fb.collection(fb.db, "corridas");
  const aoChegar = (fonte) => (s) => {
    for (const ch of s.docChanges()) {
      if (ch.type === "removed") pedidos.delete(ch.doc.id);
      else pedidos.set(ch.doc.id, { id: ch.doc.id, ...ch.doc.data(), _fonte: fonte });
    }
    pintarPedidos(true);
  };
  // Ao trocar de região, os públicos de antes saem (os diretos ficam).
  for (const [k, c] of pedidos) if (c._fonte === "perto") pedidos.delete(k);
  pararLista.push(fb.onSnapshot(fb.query(col, fb.where("status", "==", "procurando"), fb.where("paraId", "==", ""), fb.where("geo4", "in", vizinhos(pos.lat, pos.lng, 4)), fb.limit(60)), aoChegar("perto"), erroLista));
}
function pedidosValidos() {
  return [...pedidos.values()].filter((c) => c.status === "procurando" && !expirada(c) && c.clienteId !== eu.uid
    && (online || c.paraId === eu.uid)
    && c.veiculo === cad.veiculo && cad.servicos.includes(c.servico)
    && (c.paraId === eu.uid || !pos || distanciaKm(pos, c.origem) <= (c.raioKm || 5)))
    .sort((a, b) => notaPedido(b, pos, eu.uid) - notaPedido(a, pos, eu.uid));
}
function pintarPedidos(chegou = false) {
  const lista = $("egPedidos");
  const validos = cad?.status === "suspenso" ? [] : pedidosValidos();
  // Som só para pedido novo.
  const novos = validos.filter((c) => !vistos.has(c.id));
  novos.forEach((c) => vistos.add(c.id));
  if (chegou && novos.length && (online || novos.some((c) => c.paraId === eu.uid))) { avisarSom("novo"); toast(novos.some((c) => c.paraId === eu.uid) ? "Chamado direto para você!" : "Pedido novo perto de você"); }
  // Mapa: pino da coleta de cada pedido.
  if (M) {
    const nomes = validos.slice(0, 20).map((c) => "ped_" + c.id);
    M.nomes().filter((n) => n.startsWith("ped_") && !nomes.includes(n)).forEach((n) => M.tirar(n));
    validos.slice(0, 20).forEach((c) => M.marcar("ped_" + c.id, "origem", c.origem));
  }
  if (!lista) return;
  topo(online ? "Online" : "Offline", online ? `${validos.length} ${validos.length === 1 ? "pedido" : "pedidos"} perto` : "", online);
  lista.replaceChildren();
  if (!online) { validos.forEach((c) => lista.appendChild(cartaoPedido(c))); lista.appendChild(h("p", "ent-vazio", validos.length ? "Para ver também os pedidos de qualquer pessoa perto, fique online." : "Fique online para ver os pedidos perto de você.")); return; }
  if (!validos.length) { lista.appendChild(h("p", "ent-vazio", "Nenhum pedido perto agora. Fique com esta tela aberta: avisamos com som quando chegar.")); return; }
  validos.forEach((c) => lista.appendChild(cartaoPedido(c)));
}
function cartaoPedido(c) {
  const b = h("div", "ent-item" + (c.paraId === eu.uid ? " direto" : "")); b.dataset.pedido = c.id;
  const ate = pos ? kmPelaRua(pos, c.origem) : 0;
  const lin = h("div", "lin");
  const t = h("span");
  t.append(h("b", null, c.servico === "corrida" ? "Corrida" : `Entrega${c.pacote ? " · " + TAMANHOS[c.pacote.tamanho]?.nome : ""}`), h("br"),
    h("small", null, `${pos ? `${textoKm(ate)} até ${c.servico === "corrida" ? "o passageiro" : "a coleta"} (~${minutosAte(ate, cad.veiculo)} min) · ` : ""}${textoKm(c.km || 0)} de viagem`));
  const v = h("span"); v.style.textAlign = "right";
  v.append(h("span", "valor", reais(c.valor)), h("br"), h("small", null, `${reais((c.valor || 0) / Math.max(1, (c.km || 0) + ate))}/km`));
  lin.append(t, v);
  b.appendChild(lin);
  if (c.paraId === eu.uid) { const e = h("span", "ent-etq ciano", `${(c.clienteNome || "Um cliente").split(" ")[0]} chamou você`); b.appendChild(e); }
  const end = h("div", "end"); end.append(h("i"), h("span", null, [c.origem?.nome, c.origem?.sub].filter(Boolean).join(" · ")), h("i", "b"), h("span", null, [c.destino?.nome, c.destino?.sub].filter(Boolean).join(" · ")));
  b.appendChild(end);
  const info = h("small", null, `${c.pagamento === "pix" ? "Pix" : c.pagamento === "dinheiro" ? "Dinheiro" : c.pagamento === "presente" ? "Presente (paga quem deu)" : "Cartão"}${c.pacote ? ` · ${c.pacote.oque}` : ""} · pedido ${dataCurta(c.criadoEm).replace("Hoje, ", "às ")}`);
  b.appendChild(info);
  const ac = botao("Aceitar", "ent-btn ok", () => aceitar(c, ac)); ac.style.marginTop = "6px"; ac.dataset.aceitar = c.id;
  b.appendChild(ac);
  b.addEventListener("click", (e) => { if (!e.target.closest("button")) M?.enquadrar([pos, c.origem, c.destino], { baixo: innerWidth >= 900 ? 0 : painel().offsetHeight }); });
  return b;
}
// Só um aceita: transação confere que o pedido ainda está procurando.
async function aceitar(c, b) {
  b.disabled = true; b.textContent = "Aceitando...";
  if (!pos && !(await pedirGps())) { b.disabled = false; b.textContent = "Aceitar"; toast("Para aceitar, permita a localização: quem pediu acompanha você no mapa."); return; }
  const ref = fb.doc(fb.db, "corridas", c.id);
  try {
    await fb.runTransaction(fb.db, async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists() || s.data().status !== "procurando") throw new Error("pego");
      tx.update(ref, {
        status: "aceita", entregadorId: eu.uid, aceitaEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(),
        entregador: { nome: String(dados.nome || cad.nome || "").slice(0, 80), veiculo: cad.veiculo, modelo: cad.modelo || "", cor: cad.cor || "", placa: cad.placa || "" }
      });
    });
    avisarSom("status");
    toast("Pedido aceito! Siga para " + (c.servico === "corrida" ? "o passageiro" : "a coleta") + ".");
  } catch (e) {
    pedidos.delete(c.id);
    pintarPedidos();
    toast(e?.message === "pego" ? "Outra pessoa aceitou antes." : "Não foi possível aceitar: " + erroAmigavel(e));
  }
}

// =====================================================
// TRABALHO (pedido aceito)
// =====================================================
let contatoJob = null, notaCliente = null;
function ouvirTrabalho() {
  pararAtivo?.();
  pararAtivo = fb.onSnapshot(fb.query(fb.collection(fb.db, "corridas"), fb.where("entregadorId", "==", eu.uid), fb.where("status", "in", ATIVAS), fb.limit(3)), async (s) => {
    const antes = trabalho;
    const lista = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    trabalho = lista[0] || null;
    if (trabalho && (!antes || antes.id !== trabalho.id)) {
      contatoJob = null; rotaJob = null; notaCliente = null;
      fb.getDoc(fb.doc(fb.db, "corridas", trabalho.id, "privado", "contato")).then((x) => { contatoJob = x.data() || null; if (trabalho) telaTrabalho(); }).catch(() => {});
      M?.nomes().filter((n) => n.startsWith("ped_")).forEach((n) => M.tirar(n));
      if (!pos) await pedirGps();
      enviarPresenca(true);
      enviarPosicao(true);
    }
    if (!trabalho && antes) {
      // Terminou (ou quem pediu cancelou).
      M?.tirarRota(); M?.tirar("origem"); M?.tirar("destino");
      enviarPresenca(true);
      try {
        const fim = await fb.getDoc(fb.doc(fb.db, "corridas", antes.id));
        const f = fim.data();
        if (f?.status === "cancelada") { avisarSom("status"); toast(`${f.canceladaPor === "cliente" ? "Quem pediu cancelou" : "Pedido cancelado"}${f.motivo ? ": " + f.motivo : ""}.`); }
        if (f?.status === "concluida") { telaFim({ id: antes.id, ...f }); return; }
      } catch {}
      telaPainel();
      return;
    }
    if (trabalho) telaTrabalho();
  }, () => {});
}
// Posição ao vivo no pedido: a cada ~4 s andando (ou 20 m), no máximo.
async function enviarPosicao(forcar = false) {
  if (!trabalho || !pos || enviandoPos) return;
  const agora = Date.now();
  const andou = ultimaPosEnviada ? distanciaKm(ultimaPosEnviada, pos) * 1000 : 999;
  if (!forcar && (agora - ultimaPos < 4000 || (andou < 20 && agora - ultimaPos < 20000))) return;
  ultimaPos = agora; ultimaPosEnviada = { ...pos }; enviandoPos = true;
  const p = { lat: Math.round(pos.lat * 1e5) / 1e5, lng: Math.round(pos.lng * 1e5) / 1e5, rumo: Number.isFinite(pos.rumo) ? Math.round(pos.rumo) : 0, vel: Number.isFinite(pos.vel) ? Math.round(pos.vel * 10) / 10 : 0, em: fb.serverTimestamp() };
  try { await fb.updateDoc(fb.doc(fb.db, "corridas", trabalho.id), { pos: p }); } catch {}
  enviandoPos = false;
}
setInterval(() => { if (trabalho) enviarPosicao(true); }, 20000);

function proximoPonto() { return trabalho.status === "em_rota" ? trabalho.destino : trabalho.origem; }
async function desenharTrabalhoNoMapa(forcar = false) {
  if (!trabalho || !M) return;
  M.marcar("origem", "origem", trabalho.origem);
  M.marcar("destino", "destino", trabalho.destino);
  const alvo = proximoPonto();
  if (!pos) { M.desenharRota([[trabalho.origem.lat, trabalho.origem.lng], [trabalho.destino.lat, trabalho.destino.lng]]); return; }
  if (!forcar && rotaJob && rotaJob.status === trabalho.status && Date.now() - rotaJob.em < 60000) return;
  const primeira = !rotaJob || rotaJob.status !== trabalho.status;
  rotaJob = { status: trabalho.status, em: Date.now(), r: rotaJob?.r, de: { ...pos } };
  const r = await buscarRota(pos, alvo, trabalho.veiculo);
  if (!trabalho) return;
  rotaJob = { status: trabalho.status, em: Date.now(), r, de: { ...pos } };
  M.desenharRota(r.pontos);
  if (primeira) M.enquadrar([pos, alvo], { baixo: innerWidth >= 900 ? 0 : painel().offsetHeight });
  atualizarEtaJob();
}
function atualizarEtaJob() {
  const el = $("egEta"); if (!el || !trabalho) return;
  const alvo = proximoPonto();
  if (!pos) { el.textContent = ""; return; }
  const falta = kmPelaRua(pos, alvo);
  el.textContent = `${textoKm(falta)} · ~${minutosAte(falta, trabalho.veiculo)} min`;
}
function telaTrabalho() {
  const c = trabalho; if (!c) return telaPainel();
  const corrida = c.servico === "corrida";
  topo(textoStatus(c), reais(c.valor), true);
  desenharTrabalhoNoMapa();
  const p = painel(), frag = document.createDocumentFragment();
  const alvo = proximoPonto();
  const cab = h("div", "ent-eta");
  cab.append(h("h2", null, c.status === "em_rota" ? (corrida ? "Leve até o destino" : "Leve até a entrega") : c.status === "chegou" ? (corrida ? "Esperando o passageiro" : "Pegue a encomenda") : (corrida ? "Busque o passageiro" : "Vá até a coleta")));
  const eta = h("strong"); eta.id = "egEta"; cab.appendChild(eta);
  frag.appendChild(cab);
  const ps = h("div", "ent-passos"), nomes = h("div", "ent-passos-nomes"), agora = passo(c.status);
  NOMES_ETAPA[corrida ? "corrida" : "entrega"].forEach((n, i) => { ps.appendChild(h("i", i < agora ? "feito" : i === agora ? "agora" : "")); nomes.appendChild(i === agora ? h("b", null, n) : h("span", null, n)); });
  frag.append(ps, nomes);
  // Para onde ir
  const end = h("div", "ent-rota"); end.style.marginTop = "12px";
  const linha = (letra, rot, ponto) => { const b = h("div", "ent-end"); const l = h("span", "letra" + (letra === "b" ? " b" : ""), letra.toUpperCase()); const t = h("span"); t.append(h("small", null, rot), h("b", null, ponto.nome || ""), h("i", null, ponto.sub || "")); b.append(l, t); return b; };
  end.append(linha("a", corrida ? "Partida" : "Coleta", c.origem), linha("b", corrida ? "Destino" : "Entrega", c.destino));
  frag.appendChild(end);
  // Navegar
  const nav = h("div", "ent-acoes");
  const link = (icone, nome, href) => { const a = h("a", "ent-acao"); a.href = href; a.target = "_blank"; a.rel = "noopener"; a.append(ic(icone), document.createTextNode(nome)); nav.appendChild(a); };
  link("local", "Google Maps", linkNavegar(alvo, "google"));
  link("bussola", "Waze", linkNavegar(alvo, "waze"));
  const acao = (icone, nome, fn) => { const b = h("button", "ent-acao"); b.type = "button"; b.append(icone === "telefone" ? icExtra(icone) : ic(icone), document.createTextNode(nome)); b.addEventListener("click", fn); nav.appendChild(b); };
  acao("chat", "Mensagem", () => conversar(c.clienteId, c.id));
  if (c.pagadorId) acao("chat", "Quem paga", () => conversar(c.pagadorId, c.id));
  acao("telefone", "Ligar", () => ligarPara(c.clienteId, c.clienteNome, c.id));
  frag.appendChild(nav);
  // Detalhes
  const r = h("div", "ent-resumo");
  const lin = (a, b) => { if (!b) return; const d = h("div"); d.append(h("span", null, a), h("b", null, b)); r.appendChild(d); };
  lin(corrida ? "Passageiro" : "Quem pediu", c.clienteNome || "");
  if (c.pacote) lin("O que vai", `${c.pacote.oque} (${TAMANHOS[c.pacote.tamanho]?.nome || ""})`);
  if (contatoJob?.nome) lin("Quem recebe", contatoJob.nome);
  if (contatoJob?.telefone) lin("Telefone", contatoJob.telefone);
  lin("Valor", `${reais(c.valor)} · ${c.pagamento === "pix" ? "Pix" : c.pagamento === "dinheiro" ? "Dinheiro" : c.pagamento === "presente" ? "Presente (paga quem deu)" : "Cartão"}`);
  lin("Viagem", `${textoKm(c.km || 0)} · ~${textoMin(c.min || 0)}`);
  frag.appendChild(r);
  if (contatoJob?.obs) { const n = h("div", "ent-nota"); n.append(ic("chat"), h("span", null, contatoJob.obs)); frag.appendChild(n); }
  if (contatoJob?.telefone) { const a = h("a", "ent-btn sec"); a.href = `tel:${contatoJob.telefone.replace(/[^\d+]/g, "")}`; a.textContent = `Ligar para ${contatoJob.nome || "quem recebe"}`; a.style.textDecoration = "none"; frag.appendChild(a); }
  // Botão da etapa
  const prox = c.status === "aceita" ? [corrida ? "Cheguei no embarque" : "Cheguei na coleta", () => avancar("chegou")]
    : c.status === "chegou" ? [corrida ? "Iniciar viagem (PIN)" : "Peguei a encomenda", () => (corrida ? pedirPin("em_rota") : avancar("em_rota"))]
    : [corrida ? "Finalizar viagem" : "Finalizar entrega (PIN)", () => (corrida ? avancar("concluida") : pedirPin("concluida"))];
  const bt = botao(prox[0], "ent-btn ok", prox[1]); bt.id = "egAvancar";
  frag.appendChild(bt);
  if (c.status !== "em_rota") frag.appendChild(botao("Desistir deste pedido", "ent-btn perigo", desistir));
  if (c.status === "chegou") {
    const esperou = Date.now() - ms(c.chegouEm);
    const b = botao(esperou > 5 * 60000 ? (corrida ? "Passageiro não apareceu" : "Ninguém entregou a encomenda") : `Esperando há ${Math.max(0, Math.floor(esperou / 60000))} min`, "ent-btn sec", () => naoApareceu());
    b.disabled = esperou <= 5 * 60000;
    frag.appendChild(b);
  }
  p.replaceChildren(frag);
  atualizarEtaJob();
}
async function avancar(status, pin = "") {
  const c = trabalho; if (!c) return;
  const bt = $("egAvancar"); if (bt) bt.disabled = true;
  const campo = status === "chegou" ? "chegouEm" : status === "em_rota" ? "coletadoEm" : "concluidaEm";
  try {
    if (pos) await enviarPosicao(true);
    await fb.updateDoc(fb.doc(fb.db, "corridas", c.id), { status, [campo]: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ...(pin ? { pinInformado: pin } : {}) });
    avisarSom("status");
    return true;
  } catch (e) {
    if (bt) bt.disabled = false;
    toast(e?.code === "permission-denied" && pin ? "PIN errado. Peça o código de novo." : "Não foi possível: " + erroAmigavel(e));
    return false;
  }
}
function pedirPin(status) {
  const corrida = trabalho.servico === "corrida";
  const { corpo, fechar } = abrirTela(corrida ? "PIN do passageiro" : "PIN da entrega");
  corpo.appendChild(h("p", "ent-sub", corrida ? "Peça ao passageiro o código de 4 números que aparece no app dele. Ele confirma que é a pessoa certa." : "Peça a quem recebe o código de 4 números. Sem ele não dá para finalizar: protege você e quem enviou."));
  const l = h("label", "ent-campo"); l.appendChild(h("span", null, "Código"));
  const i = h("input"); i.inputMode = "numeric"; i.maxLength = 4; i.className = "eg-pin-campo"; i.id = "egPin"; i.autocomplete = "one-time-code";
  l.appendChild(i); corpo.appendChild(l);
  const ok = botao("Confirmar", "ent-btn ok", async () => {
    const v = i.value.replace(/\D/g, "");
    if (v.length !== 4) { toast("O código tem 4 números."); return; }
    ok.disabled = true;
    if (await avancar(status, v)) fechar(); else { ok.disabled = false; i.select(); }
  });
  i.addEventListener("input", () => { i.value = i.value.replace(/\D/g, "").slice(0, 4); });
  i.addEventListener("keydown", (e) => { if (e.key === "Enter") ok.click(); });
  corpo.appendChild(ok);
  setTimeout(() => i.focus(), 80);
}
function desistir() {
  confirmarHF({
    titulo: "Desistir deste pedido?", texto: "O pedido volta a procurar outra pessoa. Desistir muitas vezes pode tirar você dos próximos pedidos.", ok: "Desistir", icone: "alerta",
    aoConfirmar: async () => {
      const c = trabalho; if (!c) return;
      await fb.updateDoc(fb.doc(fb.db, "corridas", c.id), { status: "procurando", entregadorId: "", entregador: fb.deleteField(), aceitaEm: fb.deleteField(), chegouEm: fb.deleteField(), pos: fb.deleteField(), desistencias: (c.desistencias || 0) + 1, atualizadoEm: fb.serverTimestamp() });
    }
  });
}
function naoApareceu() {
  const corrida = trabalho.servico === "corrida";
  confirmarHF({
    titulo: corrida ? "Passageiro não apareceu?" : "Ninguém entregou a encomenda?", texto: "O pedido será cancelado. Combine pelo chat se houver algum valor pela espera.", ok: "Cancelar pedido", icone: "alerta",
    aoConfirmar: async () => {
      const c = trabalho; if (!c) return;
      await fb.updateDoc(fb.doc(fb.db, "corridas", c.id), { status: "cancelada", canceladaPor: "entregador", motivo: corrida ? "Passageiro não apareceu" : "Encomenda não foi entregue na coleta", canceladaEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() });
    }
  });
}
function telaFim(c) {
  topo("Concluído", reais(c.valor), online);
  M?.tirarRota(); M?.tirar("origem"); M?.tirar("destino");
  const p = painel(), frag = document.createDocumentFragment();
  const box = h("div", "ent-fim"); const i = h("div", "ok"); i.appendChild(ic("check"));
  box.append(i, h("h2", null, c.servico === "corrida" ? "Viagem concluída" : "Entrega concluída"), h("p", "ent-sub", c.pagamento === "presente" ? `Foi um presente: receba ${reais(c.valor)} de quem deu o presente.` : `Receba ${reais(c.valor)} (${c.pagamento === "pix" ? "Pix" : c.pagamento === "dinheiro" ? "dinheiro" : "cartão"}) de ${(c.clienteNome || "quem pediu").split(" ")[0]}.`));
  frag.appendChild(box);
  if (!c.avaliacaoEntregador) {
    frag.appendChild(h("h3", null, `Como foi com ${(c.clienteNome || "quem pediu").split(" ")[0]}?`));
    const est = h("div", "ent-estrelas");
    for (let n = 1; n <= 5; n++) {
      const b = h("button"); b.type = "button"; b.setAttribute("aria-label", `${n} estrela${n > 1 ? "s" : ""}`);
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
      b.addEventListener("click", async () => {
        est.querySelectorAll("button").forEach((x, k) => x.classList.toggle("on", k < n));
        try { await fb.updateDoc(fb.doc(fb.db, "corridas", c.id), { avaliacaoEntregador: { nota: n, em: fb.serverTimestamp() } }); toast("Obrigado!"); } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
      });
      est.appendChild(b);
    }
    frag.appendChild(est);
  }
  if (c.pagadorId) frag.appendChild(botao("Falar com quem paga", "ent-btn sec", () => conversar(c.pagadorId, c.id)));
  frag.appendChild(botao(online ? "Voltar aos pedidos" : "Voltar", "ent-btn", () => telaPainel()));
  p.replaceChildren(frag);
}

async function conversar(uid, corridaId = "") {
  try { const id = await garantirConversa(fb, eu.uid, uid, corridaId); const m = await import("./chat-gaveta.js?v=4"); m.abrirChat(`mensagens.html?conversa=${encodeURIComponent(id)}`); }
  catch (e) { toast("Não foi possível abrir a conversa: " + erroAmigavel(e)); }
}
async function ligarPara(uid, nome, corridaId = "") {
  try { const conv = await garantirConversa(fb, eu.uid, uid, corridaId); ligar({ para: uid, nome: nome || "", foto: "", conv, tipo: "audio" }); }
  catch (e) { toast("Não foi possível ligar: " + erroAmigavel(e)); }
}
async function divulgar() {
  const nick = dados.nickname ? "@" + dados.nickname : "";
  const t = `Agora faço ${cad.servicos.map((s) => SERVICOS[s].nome.toLowerCase() + "s").join(" e ")} pelo Help Floripa${cad.veiculo ? ` (${VEICULOS[cad.veiculo].nome.toLowerCase()})` : ""}. Me chame direto pelo app: em Entregas e corridas, toque em "Quem leva" e procure ${nick || "meu nome"}. https://helpfloripa.com.br/entregas.html`;
  try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch { return; }
  navigator.clipboard?.writeText(t).then(() => toast("Texto copiado"), () => toast(t));
}
async function abrirHistorico() {
  const { corpo } = abrirTela("Seus pedidos feitos");
  corpo.appendChild(h("p", "ent-vazio", "Carregando..."));
  let docs = [];
  try { docs = (await fb.getDocs(fb.query(fb.collection(fb.db, "corridas"), fb.where("entregadorId", "==", eu.uid), fb.orderBy("criadoEm", "desc"), fb.limit(40)))).docs; }
  catch { try { docs = (await fb.getDocs(fb.query(fb.collection(fb.db, "corridas"), fb.where("entregadorId", "==", eu.uid), fb.limit(80)))).docs; } catch {} }
  const lista = docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  corpo.replaceChildren();
  if (!lista.length) { corpo.appendChild(h("p", "ent-vazio", "Você ainda não fez nenhum pedido.")); return; }
  const total = lista.filter((c) => c.status === "concluida").reduce((t, c) => t + (Number(c.valor) || 0), 0);
  corpo.appendChild(h("p", "ent-sub", `${lista.filter((c) => c.status === "concluida").length} concluídos · ${reais(total)} combinados no total`));
  const l = h("div", "ent-lista");
  lista.forEach((c) => {
    const b = h("div", "ent-item");
    const lin = h("div", "lin");
    const t = h("span"); t.append(h("b", null, c.servico === "corrida" ? "Corrida" : "Entrega"), h("br"), h("small", null, dataCurta(c.criadoEm)));
    const v = h("span"); v.style.textAlign = "right"; v.append(h("span", "valor", reais(c.valor)), h("br"), h("span", "ent-etq " + (c.status === "concluida" ? "verde" : c.status === "cancelada" ? "vermelho" : "ciano"), textoStatus(c)));
    lin.append(t, v);
    const end = h("div", "end"); end.append(h("i"), h("span", null, c.origem?.nome || ""), h("i", "b"), h("span", null, c.destino?.nome || ""));
    b.append(lin, end);
    if (c.avaliacao) b.appendChild(h("small", null, `Avaliação: ${"★".repeat(c.avaliacao.nota)}${c.avaliacao.elogios?.length ? " · " + c.avaliacao.elogios.join(", ") : ""}`));
    l.appendChild(b);
  });
  corpo.appendChild(l);
}
