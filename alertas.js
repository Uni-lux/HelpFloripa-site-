// =====================================================
// SOS e alertas (alertas.html)
// SOS: pede ajuda ao seu Social (cartão no Mensagens) e a quem está perto; quem aceita aparece para todos ("Fulano já
// está ajudando"), sem duas pessoas indo à toa. Pets: RG do pet, perdido, encontrado e cruzamento de semelhança com
// aviso automático. Roubos e furtos: ocorrência (anônima se quiser), pistas anônimas e consulta de IMEI/placa/série.
// Veículos (18/11/2026): carro/moto com a placa guardada só com o dono, roubado → ocorrência + busca de anúncios.
// Perdidos (18/11/2026): a aba "pets" tem Pets | Pessoas (?quem=pessoas); desaparecidos/{id} com boletim e conferência.
// Parâmetros: ?aba=sos|pets|roubos|veiculos, ?sos=novo|ID, ?pet=ID, ?achado=ID, ?ocorrencia=ID, ?consultar=X, #config.
// =====================================================
import { $, toast, erroAmigavel, fb, eu, dados, iniciarRede, mandarMensagem, montarBarraRede } from "./rede.js?v=178";
import { confirmarHF } from "./confirmar.js?v=6";
import { minhaPosicao } from "./perto.js?v=3";
import {
  TIPOS_SOS, EMERGENCIAS, STATUS_SOS, sosVivo, TIPOS_OCORRENCIA, OBJETOS, normalizarId, identificadorOk, DICAS_OCORRENCIA,
  ESPECIES, CORES_PET, PORTES, PORTES_ESPECIE, nomePorte, STATUS_PET, rgPet, semelhanca, textoSemelhanca, AVISO_AUTOMATICO, MOSTRAR_A_PARTIR,
  distKm, geohash, vizinhos, RAIOS_ALERTA
} from "./alertas-base.js?v=2";
import { h, ic, botao, ms, dataCurta, avatar, lerGps, garantirConversa, irPara, abrirTela, avisarSom } from "./entregas-comum.js?v=6";
import { iconeEl, iconeSos, iconeEspecie } from "./icones-hf.js?v=4";
import { cartaoOp, grupoOps } from "./cartoes-op.js?v=2";
import { abrirCadastroPet } from "./pet-cadastro.js?v=5";
import { TIPOS_VEICULO, STATUS_VEICULO, MARCAS, CORES_VEICULO, normalizarPlaca, placaOk, placaMercosul, placaAntiga, formasPlaca, formatarPlaca, hashPlaca, imeiOk, semelhancaVeiculo, textoSemelhancaVeiculo, PARECIDO_A_PARTIR, nomeVeiculo } from "./veiculos-base.js?v=1";
import { lerHelp, avisadosDe, textoHelp, textoTudoBem, blocoAvisarFora, numeroLigar, TIPOS_RAPIDO, abrirConfigHelp } from "./help-rede.js?v=2";

// SOS em etapas (12/11/2026): 1) o Social na hora; 2) se ninguém do Social aceitar em ESCALAR_MIN minutos (ou na hora,
// se a pessoa não tem Social), quem está perto E a equipe de segurança do Help Floripa (chamado URGENTE no suporte).
const ESCALAR_MIN = 3;

const params = new URLSearchParams(location.search);
let aba = ["sos", "pets", "roubos", "veiculos"].includes(params.get("aba")) ? params.get("aba") : "sos";
let pos = null, cfg = { raio: 10, sosArea: true, petsArea: true, roubosArea: true };
const paradas = [];
const corpo = () => $("alCorpo");
const km = (x) => (x == null ? "" : x < 1 ? `${Math.round(x * 1000)} m` : `${x.toFixed(x < 10 ? 1 : 0).replace(".", ",")} km`);

// Os telefones de emergência e o botão SOS respondem na hora (antes de a conta terminar de carregar).
let avisarPronto; const pronto = new Promise((r) => (avisarPronto = r));
pintarEmergencias($("alEmerg"));
// Help (17/11/2026, antigo SOS): tocar = escolher o que está acontecendo; SEGURAR 1,2 s = Help rápido (rede pronta, 5 s para cancelar).
(() => {
  const b = $("alSos"); let t = null, segurou = false;
  const parar = () => { clearTimeout(t); t = null; b.classList.remove("segurando"); };
  b.addEventListener("pointerdown", () => { segurou = false; b.classList.add("segurando"); t = setTimeout(async () => { t = null; segurou = true; b.classList.remove("segurando"); navigator.vibrate?.([30, 40, 30]); await pronto; if (lerHelp(dados).rapido) helpRapido(); else { toast("O Help rápido está desligado na sua Rede de Help."); pedirSos(); } }, 1200); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((k) => b.addEventListener(k, () => { if (t) parar(); }));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
  b.addEventListener("click", async () => { if (segurou) { segurou = false; return; } b.classList.add("carregando"); await pronto; b.classList.remove("carregando"); pedirSos(); });
})();
$("alConfig").addEventListener("click", async () => { await pronto; abrirConfig(); });
document.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", async () => { aba = b.dataset.aba; history.replaceState(history.state, "", `alertas.html?aba=${aba}`); document.querySelectorAll("[data-aba]").forEach((x) => x.setAttribute("aria-selected", String(x === b))); await pronto; pintarAba(); }));
(async () => {
  try { await iniciarRede(); }
  catch (e) { corpo().replaceChildren(h("p", "ent-vazio", e.message || "Entre na sua conta.")); return; }
  try { montarBarraRede(""); } catch {}
  cfg = { ...cfg, ...(dados.alertas || {}) };
  avisarPronto();
  // Posição: GPS (se já permitido) ou o centro da cidade do perfil.
  pos = await lerGps(6000) || await minhaPosicao(dados).catch(() => null);
  pintarAba();
  if (location.hash === "#config") abrirConfig();
  const sos = params.get("sos");
  if (sos === "novo") pedirSos(); else if (sos === "rapido") helpRapido(); else if (sos === "rede") abrirRede(); else if (sos) abrirSos(sos);
  if (params.get("pet")) abrirRg(params.get("pet"));
  if (params.get("achado")) abrirAchado(params.get("achado"));
  if (params.get("desaparecido")) abrirPessoa(params.get("desaparecido"));
  if (params.get("ocorrencia")) abrirOcorrencia(params.get("ocorrencia"));
  if (params.get("consultar")) consultar(params.get("consultar"));
})();

function pintarEmergencias(alvo) {
  alvo.replaceChildren();
  // Toque = liga (link tel:). Nomes curtos para caber numa linha.
  const CURTO = { "Direitos humanos": "Direitos" };
  EMERGENCIAS.forEach(([n, nome]) => { const a = h("a", "al-tel"); a.href = `tel:${n}`; a.setAttribute("aria-label", `Ligar ${n}, ${nome}`); a.title = `Ligar ${n} (${nome})`; a.append(h("b", null, n), h("small", null, CURTO[nome] || nome)); alvo.appendChild(a); });
}
function pararTudo() { while (paradas.length) { try { paradas.pop()(); } catch {} } }
function pintarAba() {
  pararTudo();
  document.querySelectorAll("[data-aba]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.aba === aba)));
  corpo().replaceChildren();
  if (aba === "sos") abaSos(); else if (aba === "pets") abaPets(); else if (aba === "veiculos") abaVeiculos(); else abaRoubos();
}
const perto = () => (pos ? vizinhos(pos.lat, pos.lng, 4) : null);
function vazio(t) { return h("p", "ent-vazio", t); }
// Leitura recusada (as regras novas ainda não foram publicadas): UM aviso no topo da página, e a lista diz só "Indisponível".
function semLiberacao() {
  if (!document.getElementById("alLiberando")) {
    const a = h("div", "al-liberando"); a.id = "alLiberando"; a.setAttribute("role", "status");
    a.append(iconeEl("alerta", { tam: 18 }), h("div"));
    a.lastChild.append(h("b", null, "Parte desta área está em atualização"), h("small", null, "Algumas listas aparecem assim que a atualização terminar. O botão HELP e os telefones de emergência funcionam normalmente."));
    corpo().prepend(a);
  }
  return h("p", "ent-vazio al-indisp", "Indisponível no momento.");
}
function secao(titulo, sub) { const s = h("section", "al-sec"); s.appendChild(h("h3", null, titulo)); if (sub) s.appendChild(h("p", "ent-sub", sub)); corpo().appendChild(s); return s; }
async function perfil(uid) { try { const p = await fb.getDoc(fb.doc(fb.db, "perfis_publicos", uid)); return p.exists() ? p.data() : {}; } catch { return {}; } }

// =====================================================
// SOS
// =====================================================
function abaSos() {
  const meus = secao("Seus pedidos de ajuda");
  const doSocial = secao("Do seu Social", "Quando alguém do seu Social pede ajuda, aparece aqui e no Mensagens.");
  const area = secao("Perto de você", cfg.sosArea ? `Pedidos de ajuda até ${cfg.raio} km. Se puder ajudar, toque em "Vou ajudar".` : "Você desligou os pedidos da área nas configurações.");
  const listar = (alvo, q, filtro, vazioTxt) => {
    const lista = h("div", "ent-lista"); alvo.appendChild(lista);
    let vistos = new Set(), primeira = true;
    paradas.push(fb.onSnapshot(q, (s) => {
      const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter(filtro).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
      if (!primeira && l.some((x) => !vistos.has(x.id) && x.uid !== eu.uid)) avisarSom("novo");
      vistos = new Set(l.map((x) => x.id)); primeira = false;
      l.filter((x) => x.uid === eu.uid).forEach((x) => { if (precisaEscalar(x)) escalarSos(x, "auto"); else if (x.status === "aberto" && !x.publico && x.escalarMin > 0) setTimeout(() => { if (precisaEscalar(x)) escalarSos(x, "auto"); }, fimSocial(x) - Date.now() + 500); });
      lista.replaceChildren(...(l.length ? l.map(linhaSos) : [vazio(vazioTxt)]));
    }, () => lista.replaceChildren(semLiberacao())));
  };
  const col = fb.collection(fb.db, "sos");
  listar(meus, fb.query(col, fb.where("uid", "==", eu.uid), fb.limit(10)), (s) => sosVivo(s), "Nenhum pedido de ajuda aberto.");
  listar(doSocial, fb.query(col, fb.where("avisados", "array-contains", eu.uid), fb.limit(20)), (s) => sosVivo(s), "Ninguém do seu Social pediu ajuda.");
  if (cfg.sosArea && perto()) listar(area, fb.query(col, fb.where("publico", "==", true), fb.where("status", "in", ["aberto", "atendido"]), fb.where("geo4", "in", perto()), fb.limit(50)),
    (s) => sosVivo(s) && s.uid !== eu.uid && (distKm(pos, s) ?? 0) <= cfg.raio, "Nenhum pedido de ajuda perto agora.");
  else if (!perto()) area.appendChild(vazio("Ative a localização para ver os pedidos de ajuda perto de você."));
}
function linhaSos(s) {
  const t = TIPOS_SOS[s.tipo] || TIPOS_SOS.outro;
  const b = h("button", "ent-item al-item sos-" + s.status); b.type = "button"; b.dataset.sos = s.id;
  const lin = h("div", "lin");
  const tx = h("span", "pr-tx");
  tx.append(h("b", null, t[0]), h("small", null, `${s.uid === eu.uid ? "Você" : s.nome || "Alguém"} · ${dataCurta(s.criadoEm)}${pos ? " · " + km(distKm(pos, s)) : ""}`));
  const st = STATUS_SOS[s.status] || ["", ""];
  const [icn, cor] = iconeSos(s.tipo);
  lin.append(iconeEl(icn, { cor, tam: 20, fundo: true }), tx, h("span", "ent-etq " + st[1], s.status === "atendido" && s.ajudanteNome ? `${s.ajudanteNome.split(" ")[0]} está ajudando` : st[0]));
  b.appendChild(lin);
  if (s.texto) b.appendChild(h("small", "pr-msg", s.texto));
  b.addEventListener("click", () => abrirSos(s.id));
  return b;
}
async function pedirSos() {
  const H = lerHelp(dados);
  const { corpo: c, fechar } = abrirTela("Pedir Help");
  const aviso = h("div", "al-urgente");
  aviso.append(h("b", null, "Em perigo ou emergência? Ligue agora:"));
  const tels = h("div", "al-tels"); pintarEmergencias(tels); aviso.appendChild(tels);
  aviso.appendChild(h("small", null, "O Help avisa a sua rede e quem está perto, mas não chama a polícia, o SAMU nem os bombeiros."));
  c.appendChild(aviso);
  let tipo = "";
  c.appendChild(h("h3", null, "O que está acontecendo"));
  const g = h("div", "al-tipos");
  for (const [k, [nome]] of Object.entries(TIPOS_SOS)) {
    const b = h("button", "al-tipo"); b.type = "button"; b.dataset.tipo = k; b.setAttribute("aria-pressed", "false");
    const [icn, cor] = iconeSos(k);
    b.append(iconeEl(icn, { cor, tam: 24, fundo: true }), h("small", null, nome));
    b.addEventListener("click", () => { tipo = k; g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); atualizar(); });
    g.appendChild(b);
  }
  c.appendChild(g);
  const area = h("textarea"); area.maxLength = 300; area.id = "alSosTexto"; area.placeholder = "Conte rápido (opcional): onde exatamente, o que precisa";
  const la = h("label", "ent-campo"); la.append(h("span", null, "Detalhes"), area); c.appendChild(la);
  // Quem é avisado, em etapas: Social na hora → quem está perto + equipe de segurança se ninguém do Social aceitar.
  c.appendChild(h("h3", null, "Quem é avisado"));
  let avisados = [], perto = H.perto, equipe = H.equipe, escolheu = false, carregouSocial = false;
  const etapas = h("ol", "al-etapas");
  const et1 = h("li", "al-et"), et2 = h("li", "al-et"), et3 = h("li", "al-et");
  et1.append(iconeEl("pessoas", { cor: "#2fbf71", tam: 18, fundo: true }), h("div"));
  et1.lastChild.append(h("b", null, "1. Seu Social, na hora"), h("small", null, "Carregando..."));
  et2.append(iconeEl("alvo", { cor: "#ff7a1a", tam: 18, fundo: true }), h("div"));
  et2.lastChild.append(h("b", null, "2. Pessoas perto de você"), h("small", null, ""));
  const seg = h("div", "al-seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Quando avisar quem está perto");
  const opPerto = [["depois", `Se ninguém do Social aceitar em ${ESCALAR_MIN} min`], ["agora", "Na hora"], ["nao", "Não avisar"]];
  opPerto.forEach(([k, nome]) => { const b = h("button", null, nome); b.type = "button"; b.dataset.perto = k; b.addEventListener("click", () => { perto = k; escolheu = true; pintarEtapas(); }); seg.appendChild(b); });
  et2.lastChild.appendChild(seg);
  et3.append(iconeEl("equipe", { cor: "#00adee", tam: 18, fundo: true }), h("div"));
  const le = h("label", "ent-check al-check-eq"); const ce = h("input"); ce.type = "checkbox"; ce.checked = H.equipe; ce.id = "alSosEquipe";
  ce.addEventListener("change", () => { equipe = ce.checked; pintarEtapas(); });
  le.append(ce, h("span", null, "Avisar a equipe de segurança do Help Floripa como URGENTE"));
  et3.lastChild.append(h("b", null, "3. Equipe do Help Floripa"), h("small", null, ""), le);
  etapas.append(et1, et2, et3); c.appendChild(etapas);
  const pintarEtapas = () => {
    const temSocial = avisados.length > 0;
    if (!escolheu) perto = temSocial || !carregouSocial ? H.perto : H.perto === "nao" ? "nao" : "agora";
    if (!temSocial && carregouSocial && perto === "depois") perto = "agora";
    seg.querySelector('[data-perto="depois"]').hidden = carregouSocial && !temSocial;
    seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.perto === perto)));
    et1.querySelector("small").textContent = !carregouSocial ? "Procurando o seu Social..." : temSocial ? `${avisados.length} ${avisados.length === 1 ? "pessoa recebe" : "pessoas recebem"} o pedido no Mensagens agora.` : "Você ainda não tem ninguém no Social (família, amigos, duo). Por isso avisamos quem está perto e a equipe na hora.";
    et1.classList.toggle("off", !temSocial);
    et2.querySelector("small").textContent = perto === "nao" ? "Ninguém da área recebe o pedido." : perto === "agora" ? `Quem está até ${cfg.raio} km vê o tipo de ajuda e onde você está.` : `Se ninguém do Social aceitar em ${ESCALAR_MIN} minutos, quem está até ${cfg.raio} km é avisado sozinho.`;
    et2.classList.toggle("off", perto === "nao");
    et3.querySelector("small").textContent = !equipe ? "A equipe não será avisada." : perto === "nao" ? "Recebe o pedido como urgente na hora." : perto === "agora" ? "Recebe o pedido como urgente junto com quem está perto." : `Recebe como urgente se ninguém do Social aceitar em ${ESCALAR_MIN} minutos.`;
    et3.classList.toggle("off", !equipe);
  };
  pintarEtapas();
  (async () => {
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "vinculos"), fb.where("participantes", "array-contains", eu.uid), fb.where("status", "==", "aceito"), fb.limit(30)));
      avisados = avisadosDe(H, [...new Set(s.docs.map((d) => (d.data().participantes || []).find((u) => u !== eu.uid)).filter(Boolean))]);
    } catch { avisados = []; }
    carregouSocial = true; pintarEtapas();
  })();
  // Fora do app (Rede de Help): contatos que recebem por WhatsApp/SMS depois de enviar.
  const fora = h("div", "al-fora");
  const pintarFora = () => {
    const n = H.contatos.length, lig = numeroLigar(H);
    fora.replaceChildren(iconeEl("pessoas", { cor: "#8b9aa5", tam: 18, fundo: true }), h("div"));
    fora.lastChild.append(h("b", null, n ? `${n} ${n === 1 ? "contato" : "contatos"} fora do app` : "Ninguém de fora do app"),
      h("small", null, n ? `Depois de enviar, 1 toque manda ${[H.whats && "WhatsApp", H.sms && "SMS"].filter(Boolean).join(" e ") || "a mensagem"} com o seu mapa${lig ? ` e liga para ${lig}` : ""}.` : "Mãe, vizinho, colega: adicione até 5 na sua Rede de Help."));
    const b = h("button", "al-fora-bt", n ? "Rede" : "Adicionar"); b.type = "button"; b.addEventListener("click", () => abrirRede(() => { Object.assign(H, lerHelp(dados)); pintarFora(); }));
    fora.appendChild(b);
  };
  pintarFora(); c.appendChild(fora);
  const enviar = botao("Escolha o que está acontecendo", "ent-btn al-btn-sos", async () => {
    enviar.disabled = true; enviar.textContent = "Pegando sua localização...";
    const p = await lerGps(10000);
    if (!p) { enviar.disabled = false; atualizar(); toast("Precisamos da sua localização para o Help. Ative o GPS e permita no navegador."); return; }
    enviar.textContent = "Enviando...";
    try {
      const id = await enviarHelp({ tipo, texto: area.value.trim(), avisados, perto, equipe, p });
      fechar(); toast("Help enviado. Fique onde está se for seguro."); abrirSos(id);
    } catch (e) { enviar.disabled = false; atualizar(); toast(e?.code === "permission-denied" ? "O Help ainda está sendo liberado. Ligue 190/192/193 se for emergência." : "Não foi possível enviar: " + erroAmigavel(e)); }
  });
  enviar.id = "alSosEnviar";
  const atualizar = () => { enviar.disabled = !tipo; enviar.textContent = tipo ? "Enviar Help agora" : "Escolha o que está acontecendo"; };
  atualizar();
  c.appendChild(enviar);
}
// Grava o Help (coleção `sos`, as mesmas regras de antes), avisa o Social no Mensagens e a equipe quando for a hora.
async function enviarHelp({ tipo, texto = "", avisados, perto, equipe, p }) {
  const temSocial = avisados.length > 0;
  const publico = perto === "agora" || (perto === "depois" && !temSocial);
  const base = {
    uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), tipo, texto: String(texto || "").slice(0, 300),
    lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5, precisao: Math.round(p.precisao || 0), geo4: geohash(p.lat, p.lng, 4),
    publico, avisados, status: "aberto", ajudanteId: "", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
  };
  const extra = { equipe, escalarMin: perto === "depois" && temSocial ? ESCALAR_MIN : 0 };
  // O id sai antes: se a conexão cair e o envio for repetido (ALREADY_EXISTS) ou der qualquer erro, conferimos se o pedido
  // já chegou ao servidor antes de dizer que falhou (num Help, "não enviado" quando foi enviado é perigoso).
  const ref = fb.doc(fb.collection(fb.db, "sos"));
  const chegou = () => fb.getDoc(ref).then((d) => d.exists() && d.data().uid === eu.uid).catch(() => false);
  try { await fb.setDoc(ref, { ...base, ...extra }); }
  catch (e) {
    if (!(await chegou())) {
      if (e?.code !== "permission-denied") throw e;
      try { await fb.setDoc(ref, { ...base, publico: perto !== "nao" }); } catch (e2) { if (!(await chegou())) throw e2; }
      extra.antigo = true;
    }
  }
  // Social: cartão no Mensagens de cada pessoa (chega também como notificação com o app fechado quando o push estiver ligado).
  avisados.forEach((u) => mandarMensagem(u, { tipoArquivo: "cartao", cartao: { tipo: "sos", id: ref.id, sosTipo: tipo, nome: String(dados.nome || "").slice(0, 80) } }, `Help: ${TIPOS_SOS[tipo][0]}`).catch(() => {}));
  // Equipe: na hora quando quem está perto já foi avisado (ou não vai ser); senão, junto com a escalada.
  if (equipe && (publico || perto === "nao" || extra.antigo)) chamadoSos({ id: ref.id, ...base, criadoEm: null }, temSocial ? "" : "Sem ninguém no Social: equipe avisada na hora.").catch(() => {});
  enviadosAgora.add(ref.id);
  return ref.id;
}
const enviadosAgora = new Set();
async function socialDaRede() {
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "vinculos"), fb.where("participantes", "array-contains", eu.uid), fb.where("status", "==", "aceito"), fb.limit(30)));
    return [...new Set(s.docs.map((d) => (d.data().participantes || []).find((u) => u !== eu.uid)).filter(Boolean))];
  } catch { return []; }
}
// Rede de Help (help-rede.js) aberta daqui: lê o Social com nome e foto.
async function abrirRede(aoSalvar) {
  const uids = await socialDaRede();
  const social = (await Promise.all(uids.map(async (u) => { const p = await perfil(u); return { uid: u, nome: p.nome || "Usuário", foto: p.fotoPerfil || "", papel: "" }; })));
  abrirConfigHelp({ fb, uid: eu.uid, dados, social, toast, aoSalvar });
}
// Help rápido: 5 s para cancelar e envia com a Rede de Help (tipo e recado prontos). O GPS já é lido durante a contagem.
let rapidoAberto = false;
function helpRapido() {
  if (rapidoAberto) return; rapidoAberto = true;
  const H = lerHelp(dados);
  const tela = h("div", "al-rapido"); tela.setAttribute("role", "alertdialog"); tela.setAttribute("aria-modal", "true"); tela.dataset.semVoltar = "";
  const n = h("b", "al-rapido-n", "5");
  const anel = h("div", "al-rapido-anel"); anel.appendChild(n);
  const tit = h("strong", null, "Enviando Help");
  const sub = h("small", null, `${TIPOS_RAPIDO[H.tipoRapido]} · para a sua rede`);
  const cancelar = h("button", "al-rapido-cancelar", "Cancelar"); cancelar.type = "button"; cancelar.id = "alRapidoCancelar";
  const agora = h("button", "al-rapido-agora", "Enviar agora"); agora.type = "button"; agora.id = "alRapidoAgora";
  tela.append(anel, tit, sub, agora, cancelar);
  document.body.appendChild(tela);
  const gps = lerGps(12000);
  const uidsP = socialDaRede();
  let falta = 5, fim = false;
  const sair = () => { fim = true; clearInterval(rel); tela.remove(); rapidoAberto = false; };
  const rel = setInterval(() => { falta--; n.textContent = String(Math.max(0, falta)); navigator.vibrate?.(40); if (falta <= 0) disparar(); }, 1000);
  cancelar.addEventListener("click", () => { sair(); toast("Help cancelado"); });
  agora.addEventListener("click", () => disparar());
  async function disparar() {
    if (fim) return; fim = true; clearInterval(rel);
    tit.textContent = "Pegando sua localização..."; n.textContent = ""; agora.remove(); cancelar.disabled = true;
    const p = await gps;
    if (!p) { sair(); toast("Precisamos da sua localização. Ligue 190 se for emergência."); pedirSos(); return; }
    tit.textContent = "Enviando...";
    try {
      const avisados = avisadosDe(H, await uidsP);
      const perto = avisados.length ? H.perto : H.perto === "nao" ? "nao" : "agora";
      const id = await enviarHelp({ tipo: H.tipoRapido, texto: H.msg, avisados, perto, equipe: H.equipe, p });
      sair(); toast("Help enviado."); abrirSos(id);
    } catch (e) { console.warn("[Help]", e); sair(); toast(e?.code === "permission-denied" ? "O Help ainda está sendo liberado. Ligue 190/192/193." : "Não foi possível enviar: " + erroAmigavel(e)); }
  }
}
async function abrirSos(id) {
  const { corpo: c, fechar, folha } = abrirTela("Help");
  let foraBox = null, bemBox = null;
  let mapa = null, vigia = null, ultimaPos = 0, relogio = 0, ultimo = null;
  relogio = setInterval(() => { if (!ultimo) return; info.querySelectorAll("[data-falta]").forEach((el) => { el.textContent = faltaTexto(ultimo); }); if (ultimo.uid === eu.uid && precisaEscalar(ultimo)) escalarSos(ultimo, "auto"); }, 1000);
  const mapaEl = h("div", "al-mapa");
  const info = h("div");
  c.append(mapaEl, info);
  try { const mv = await import("./mapa-vivo.js?v=2"); mapa = await mv.criarMapa(mapaEl, { zoom: 16 }); } catch { mapaEl.remove(); }
  const parar = fb.onSnapshot(fb.doc(fb.db, "sos", id), (snap) => {
    if (!snap.exists()) { info.replaceChildren(vazio("Pedido não encontrado.")); return; }
    const s = { id, ...snap.data() };
    ultimo = s;
    const dono = s.uid === eu.uid, ajudo = s.ajudanteId === eu.uid, vivo = sosVivo(s);
    if (mapa) { if (mapa.posicao("sos")) mapa.mover("sos", s); else { mapa.marcar("sos", "destino", s); mapa.irPara(s, 16); } if (pos && !dono) mapa.marcar("eu", "eu", pos); }
    const t = TIPOS_SOS[s.tipo] || TIPOS_SOS.outro, st = STATUS_SOS[s.status] || ["", ""];
    const box = h("div", "al-sos-cab");
    const [icn, cor] = iconeSos(s.tipo);
    box.append(iconeEl(icn, { cor, tam: 26, fundo: true }), h("div"));
    box.lastChild.append(h("b", null, t[0]), h("small", null, `${dono ? "Você pediu" : (s.nome || "Alguém") + " pediu"} · ${dataCurta(s.criadoEm)}${pos && !dono ? " · " + km(distKm(pos, s)) : ""}${s.precisao ? ` · precisão ${s.precisao} m` : ""}`));
    const frag = [box];
    if (s.texto) frag.push(h("p", "al-sos-txt", `“${s.texto}”`));
    const estado = h("div", "al-estado " + st[1]);
    estado.textContent = s.status === "atendido" ? `${ajudo ? "Você" : (s.ajudanteNome || "Alguém")} ${ajudo ? "está indo ajudar" : "já está ajudando"}${s.aceitoEm ? " desde " + dataCurta(s.aceitoEm).replace("Hoje, ", "") : ""}` : !vivo && ["aberto", "atendido"].includes(s.status) ? "Pedido expirado (mais de 3 horas)" : st[0];
    estado.id = "alSosEstado";
    frag.push(estado);
    if (dono || podeVerEtapas(s)) frag.push(etapasSos(s, dono));
    const acoes = h("div", "al-acoes");
    if (dono && vivo) {
      acoes.append(botao("Já estou bem (resolvido)", "ent-btn ok", () => mudar({ status: "resolvido", fimEm: fb.serverTimestamp() }, "Que bom! Pedido encerrado.")),
        botao("Cancelar o pedido", "ent-btn sec", () => mudar({ status: "cancelado", fimEm: fb.serverTimestamp() }, "Pedido cancelado")));
      if (s.ajudanteId) acoes.appendChild(botao(`Conversar com ${(s.ajudanteNome || "quem ajuda").split(" ")[0]}`, "ent-btn sec", () => conversar(s.ajudanteId, { tipo: "sos", id: s.id })));
      // Rede de Help: contatos de fora do app (1 toque cada), feito uma vez para não perder o "enviado" a cada atualização.
      if (!foraBox) foraBox = blocoAvisarFora(lerHelp(dados), textoHelp({ nome: dados.nome, tipo: t[0], msg: s.texto, lat: s.lat, lng: s.lng, precisao: s.precisao, id: s.id, ficha: lerHelp(dados).ficha }), { titulo: enviadosAgora.has(s.id) ? "Agora avise quem está fora do app" : "Avisar quem está fora do app" }) || h("span");
      frag.push(foraBox);
      // Atualiza a posição de quem pediu enquanto esta tela estiver aberta.
      if (vigia == null && navigator.geolocation) vigia = navigator.geolocation.watchPosition((p) => {
        if (Date.now() - ultimaPos < 20000) return; ultimaPos = Date.now();
        fb.updateDoc(fb.doc(fb.db, "sos", id), { lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5, precisao: Math.round(p.coords.accuracy || 0), geo4: geohash(p.coords.latitude, p.coords.longitude, 4), atualizadoEm: fb.serverTimestamp() }).catch(() => {});
      }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
    } else if (dono && s.status === "resolvido") {
      if (!bemBox) bemBox = blocoAvisarFora(lerHelp(dados), textoTudoBem(String(dados.nome || "").split(" ")[0]), { ligar: false, titulo: "Avisar que está tudo bem" }) || h("span");
      frag.push(bemBox);
    } else if (!dono && vivo) {
      if (s.status === "aberto") { const b = botao("Vou ajudar", "ent-btn ok", () => aceitar(s)); b.id = "alVouAjudar"; acoes.appendChild(b); }
      else if (!ajudo) acoes.appendChild(h("p", "ent-sub", "Já tem alguém indo. Se ainda assim puder ajudar, mande uma mensagem antes de ir."));
      if (ajudo) acoes.append(botao("Resolvido", "ent-btn ok", () => mudar({ status: "resolvido", fimEm: fb.serverTimestamp() }, "Obrigado por ajudar!")),
        botao("Não vou conseguir ir", "ent-btn sec", () => mudar({ status: "aberto", ajudanteId: "", ajudanteNome: "", aceitoEm: null }, "Pedido liberado para outra pessoa")));
      const rota = h("a", "ent-btn sec"); rota.href = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`; rota.target = "_blank"; rota.rel = "noopener"; rota.textContent = "Como chegar"; rota.style.textDecoration = "none";
      acoes.append(rota, botao(`Conversar com ${(s.nome || "a pessoa").split(" ")[0]}`, "ent-btn sec", () => conversar(s.uid, { tipo: "sos", id: s.id })));
    }
    const tels = h("div", "al-tels"); pintarEmergencias(tels);
    frag.push(acoes, h("h3", null, "Emergência"), tels);
    info.replaceChildren(...frag);
    async function mudar(campos, ok) {
      try { await fb.updateDoc(fb.doc(fb.db, "sos", id), { ...campos, atualizadoEm: fb.serverTimestamp() }); toast(ok); }
      catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
    }
  }, () => info.replaceChildren(vazio("Você não tem acesso a este pedido.")));
  folha.addEventListener("fechada", () => { parar(); clearInterval(relogio); if (vigia != null) navigator.geolocation.clearWatch(vigia); try { mapa?.destruir(); } catch {} });
}
// ---------- Etapas do SOS (Social → perto + equipe) ----------
const fimSocial = (s) => (ms(s.criadoEm) || Date.now()) + (s.escalarMin || 0) * 60000;
const precisaEscalar = (s) => sosVivo(s) && s.status === "aberto" && !s.publico && (s.escalarMin || 0) > 0 && Date.now() >= fimSocial(s);
const podeVerEtapas = (s) => (s.avisados || []).includes(eu.uid);
function faltaTexto(s) {
  if (s.publico || !(s.escalarMin > 0)) return "";
  const f = Math.max(0, fimSocial(s) - Date.now()), m = Math.floor(f / 60000), seg = Math.floor((f % 60000) / 1000);
  return s.status !== "aberto" ? "" : f > 0 ? `em ${m}:${String(seg).padStart(2, "0")}` : "agora";
}
function etapasSos(s, dono) {
  const ol = h("ol", "al-etapas vivo");
  const passo = (icone, cor, titulo, texto, estado, extra) => {
    const li = h("li", "al-et " + estado);
    li.append(iconeEl(icone, { cor, tam: 18, fundo: true }), h("div"));
    li.lastChild.append(h("b", null, titulo)); const sm = h("small", null, texto); li.lastChild.appendChild(sm);
    if (extra) li.lastChild.appendChild(extra);
    if (estado === "feito") li.appendChild(iconeEl("check", { cor: "#2fbf71", tam: 16 }));
    return { li, sm };
  };
  const nS = (s.avisados || []).length;
  ol.appendChild(passo("pessoas", "#2fbf71", "Seu Social", nS ? `${nS} ${nS === 1 ? "pessoa avisada" : "pessoas avisadas"} no Mensagens` : "Sem ninguém no Social", nS ? "feito" : "off").li);
  let p2;
  if (s.publico) p2 = passo("alvo", "#ff7a1a", "Pessoas perto", s.escaladoEm ? `Avisadas: ninguém do Social aceitou em ${s.escalarMin || ESCALAR_MIN} min` : "Avisadas na hora", "feito");
  else if ((s.escalarMin || 0) > 0 && s.status === "aberto") {
    const quando = h("span", "al-falta"); quando.dataset.falta = ""; quando.textContent = faltaTexto(s);
    const tx = h("small"); tx.append("Se ninguém do Social aceitar, avisamos ", quando);
    p2 = passo("alvo", "#ff7a1a", "Pessoas perto", "", "espera");
    p2.sm.replaceWith(tx);
    if (dono) p2.li.lastChild.appendChild(botao("Avisar quem está perto agora", "ent-btn sec al-btn-escalar", () => escalarSos(s, "manual")));
  } else p2 = passo("alvo", "#ff7a1a", "Pessoas perto", s.status === "atendido" ? "Não precisou: alguém do Social aceitou" : "Não avisadas", "off");
  ol.appendChild(p2.li);
  const eq = s.suporteId ? passo("equipe", "#00adee", "Equipe do Help Floripa", `Avisada como urgente · chamado #${s.suporteId.slice(0, 6).toUpperCase()}`, "feito")
    : s.equipe === false ? passo("equipe", "#00adee", "Equipe do Help Floripa", "Você escolheu não avisar", "off")
    : s.equipe === undefined ? passo("equipe", "#00adee", "Equipe do Help Floripa", "Em emergência, ligue 190, 192 ou 193", "off")
    : s.publico || (s.escalarMin || 0) === 0 ? passo("equipe", "#00adee", "Equipe do Help Floripa", "Avisando como urgente...", "espera")
    : passo("equipe", "#00adee", "Equipe do Help Floripa", s.status === "atendido" ? "Não precisou: alguém do Social aceitou" : "Avisada junto com quem está perto", s.status === "atendido" ? "off" : "espera");
  ol.appendChild(eq.li);
  return ol;
}
const escalando = new Set();
// Avisa quem está perto (publico) e abre o chamado urgente da equipe. Só quem pediu grava (regra sosMuda).
async function escalarSos(s, como) {
  if (escalando.has(s.id) || s.publico || !sosVivo(s)) return;
  escalando.add(s.id);
  try {
    let suporteId = s.suporteId || "";
    if (s.equipe !== false && !suporteId) suporteId = await chamadoSos(s, `Ninguém do Social (${(s.avisados || []).length}) aceitou em ${s.escalarMin || ESCALAR_MIN} min${como === "manual" ? " (a pessoa pediu para avisar todos)" : ""}.`, false).catch(() => "");
    await fb.updateDoc(fb.doc(fb.db, "sos", s.id), { publico: true, escaladoEm: fb.serverTimestamp(), ...(suporteId ? { suporteId } : {}), atualizadoEm: fb.serverTimestamp() });
    toast(como === "manual" ? "Pessoas perto avisadas." : "Ninguém do Social respondeu: avisamos quem está perto e a equipe.");
  } catch (e) { escalando.delete(s.id); if (como === "manual") toast("Não foi possível: " + erroAmigavel(e)); }
}
// Chamado URGENTE no suporte (fila Segurança, prazo de 10 min). gravarNoSos: guarda o número no pedido.
async function chamadoSos(s, motivo = "", gravarNoSos = true) {
  const t = TIPOS_SOS[s.tipo]?.[0] || "Pedido de ajuda";
  const ref = fb.doc(fb.collection(fb.db, "suporte"));
  const lote = fb.writeBatch(fb.db);
  const texto = [
    "PEDIDO DE AJUDA (HELP) · URGENTE",
    `O que está acontecendo: ${t}`,
    s.texto ? `Detalhes: “${s.texto}”` : "",
    `Onde: https://www.google.com/maps?q=${s.lat},${s.lng}${s.precisao ? ` (precisão de ${s.precisao} m)` : ""}`,
    `Social avisado: ${(s.avisados || []).length} ${(s.avisados || []).length === 1 ? "pessoa" : "pessoas"}.`,
    motivo,
    `Acompanhar ao vivo: https://helpfloripa.com.br/alertas.html?sos=${s.id}`
  ].filter(Boolean).join("\n");
  lote.set(ref, { prioridade: "urgente", uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), assunto: `Help: ${t}`.slice(0, 120), categoria: "sos", status: "aberto", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
  lote.set(fb.doc(fb.db, "suporte", ref.id, "mensagens", "inicio"), { autorId: eu.uid, equipe: false, texto: texto.slice(0, 2000), em: fb.serverTimestamp() });
  await lote.commit();
  if (gravarNoSos) await fb.updateDoc(fb.doc(fb.db, "sos", s.id), { suporteId: ref.id, atualizadoEm: fb.serverTimestamp() }).catch(() => {});
  return ref.id;
}

// Só uma pessoa aceita: transação confere que ainda ninguém pegou.
async function aceitar(s) {
  const ref = fb.doc(fb.db, "sos", s.id);
  try {
    await fb.runTransaction(fb.db, async (tx) => {
      const d = await tx.get(ref);
      if (!d.exists() || d.data().status !== "aberto") throw new Error("pego");
      tx.update(ref, { status: "atendido", ajudanteId: eu.uid, ajudanteNome: String(dados.nome || "").slice(0, 80), aceitoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() });
    });
    mandarMensagem(s.uid, { tipoArquivo: "cartao", cartao: { tipo: "sos", id: s.id, sosTipo: s.tipo, nome: s.nome || "", acao: "ajudando" } }, "Help: estou indo ajudar", { servico: { tipo: "sos", id: s.id } }).catch(() => {});
    toast("Obrigado! A pessoa e os outros veem que você está indo.");
  } catch (e) { toast(e?.message === "pego" ? "Outra pessoa já aceitou ajudar." : "Não foi possível: " + erroAmigavel(e)); }
}
async function conversar(uid, servico = null) {
  try { const id = await garantirConversa(fb, eu.uid, uid, servico); const m = await import("./chat-gaveta.js?v=4"); m.abrirChat(`mensagens.html?conversa=${encodeURIComponent(id)}`); }
  catch (e) { toast("Não foi possível abrir a conversa: " + erroAmigavel(e)); }
}

// =====================================================
// PERDIDOS (18/11/2026): pets e pessoas na mesma aba. Pets: o MESMO formulário do Social (pet-cadastro.js) para o RG e
// para "Encontrei um animal". Pessoas: aviso de desaparecimento com boletim de ocorrência, conferido pela equipe antes
// de aparecer (evita alguém usar o site para achar quem fugiu de uma situação de violência), pistas "Vi esta pessoa"
// (anônimas se quiser) e o que fazer quando encontra alguém perdido.
// =====================================================
let quem = params.get("quem") === "pessoas" ? "pessoas" : "pets";
function abaPets() {
  const seg = h("div", "al-seg"); seg.setAttribute("role", "tablist");
  [["pets", "Pets"], ["pessoas", "Pessoas"]].forEach(([k, n]) => {
    const b = h("button", null, n); b.type = "button"; b.dataset.quem = k; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(quem === k));
    b.addEventListener("click", () => { quem = k; history.replaceState(history.state, "", `alertas.html?aba=pets${k === "pessoas" ? "&quem=pessoas" : ""}`); pintarAba(); });
    seg.appendChild(b);
  });
  corpo().appendChild(seg);
  if (quem === "pessoas") return abaPessoas();
  corpo().appendChild(grupoOps([
    cartaoOp({ nome: "Cadastrar meu pet", desc: "RG com foto e características", icone: "pata", dados: { acao: "pet" }, aoTocar: () => editarPet(null) }),
    cartaoOp({ nome: "Encontrei um animal", desc: "Avisamos os possíveis tutores", icone: "lupa", dados: { acao: "achei" }, aoTocar: () => achei() })
  ], { colunas: 2, unico: false, rotulo: "Ações" }));
  const meus = secao("Seus pets");
  const lm = h("div", "ent-lista"); meus.appendChild(lm);
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "pets"), fb.where("donoId", "==", eu.uid), fb.limit(20)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    lm.replaceChildren(...(l.length ? l.map((p) => linhaPet(p, true)) : [vazio("Nenhum pet cadastrado.")]));
  }, () => lm.replaceChildren(semLiberacao())));
  if (!cfg.petsArea) return;
  const perdidos = secao("Perdidos perto de você");
  const encontrados = secao("Encontrados perto de você");
  if (!perto()) { perdidos.appendChild(vazio("Ative a localização para ver os pets perto.")); encontrados.remove(); return; }
  const lp = h("div", "ent-lista"), le = h("div", "ent-lista");
  perdidos.appendChild(lp); encontrados.appendChild(le);
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "pets"), fb.where("visivel", "==", true), fb.where("status", "==", "perdido"), fb.where("geo4", "in", perto()), fb.limit(40)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.donoId !== eu.uid);
    lp.replaceChildren(...(l.length ? l.map((p) => linhaPet(p, false)) : [vazio("Nenhum pet perdido perto agora.")]));
  }, () => lp.replaceChildren(vazio("Indisponível no momento."))));
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "pets_achados"), fb.where("status", "==", "ativo"), fb.where("geo4", "in", perto()), fb.limit(40)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    le.replaceChildren(...(l.length ? l.map(linhaAchado) : [vazio("Nenhum animal encontrado perto agora.")]));
  }, () => le.replaceChildren(vazio("Indisponível no momento."))));
}
const fotoValida = (u) => /^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/)/.test(String(u || ""));
function fotoOuEmoji(foto, especie, icone = "") {
  const f = h("span", "al-foto");
  if (fotoValida(foto)) { const i = document.createElement("img"); i.src = foto; i.alt = ""; f.appendChild(i); }
  else { f.classList.add("sem-foto"); f.appendChild(iconeEl(icone || iconeEspecie(especie)[0], { tam: 24 })); }
  return f;
}
const descricaoPet = (p) => [ESPECIES[p.especie]?.[0], p.raca, (p.cores || []).join(" e "), nomePorte(p.especie, p.porte)].filter(Boolean).join(" · ");
function linhaPet(p, meu) {
  const b = h("button", "ent-item al-item"); b.type = "button"; b.dataset.pet = p.id;
  const lin = h("div", "lin");
  const tx = h("span", "pr-tx"); tx.append(h("b", null, p.nome || "Pet"), h("small", null, descricaoPet(p)));
  const st = STATUS_PET[p.status] || STATUS_PET.casa;
  lin.append(fotoOuEmoji(p.foto, p.especie), tx, h("span", "ent-etq " + st[1], st[0]));
  b.appendChild(lin);
  if (p.status === "perdido") b.appendChild(h("small", null, `Visto por último ${p.perdidoLocal?.nome ? "em " + p.perdidoLocal.nome + " · " : ""}${dataCurta(p.perdidoEm)}${pos && p.perdidoLocal ? " · " + km(distKm(pos, p.perdidoLocal)) : ""}`));
  b.addEventListener("click", () => (meu ? opcoesMeuPet(p) : abrirRg(p.id)));
  return b;
}
function linhaAchado(a) {
  const b = h("button", "ent-item al-item"); b.type = "button"; b.dataset.achado = a.id;
  const lin = h("div", "lin");
  const tx = h("span", "pr-tx"); tx.append(h("b", null, `${ESPECIES[a.especie]?.[0] || "Animal"} encontrado`), h("small", null, `${descricaoPet(a)} · ${a.local?.nome || ""} · ${dataCurta(a.quando || a.criadoEm)}${pos ? " · " + km(distKm(pos, a.local)) : ""}`));
  lin.append(fotoOuEmoji(a.foto, a.especie), tx);
  b.appendChild(lin);
  b.addEventListener("click", () => abrirAchado(a.id));
  return b;
}
// Foto reduzida para caber no documento (sem Storage): JPEG até ~250 KB.
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
// Cadastro do pet: o mesmo formulário do Social (pet-cadastro.js).
function editarPet(p) {
  abrirCadastroPet({ fb, uid: eu.uid, dados, pet: p || null, pos, toast });
}
// ---------- Pessoas desaparecidas ----------
const CONDICOES = { crianca: ["Criança ou adolescente", "pessoa"], idoso: ["Pessoa idosa", "pessoa"], demencia: ["Alzheimer ou confusão", "pessoa"], deficiencia: ["Deficiência ou autismo", "pessoa"], adulto: ["Adulto", "pessoa"], outro: ["Outra situação", "pessoa"] };
const PARENTESCOS_DESAP = { pais: "Pai ou mãe", filho: "Filho ou filha", conjuge: "Cônjuge", irmao: "Irmão ou irmã", parente: "Outro parente", responsavel: "Responsável legal", amigo: "Amigo ou vizinho" };
const STATUS_DESAP = { analise: ["Em análise", "amarelo"], ativo: ["Procurando", "vermelho"], encontrado: ["Encontrado", "verde"], removido: ["Encerrado", "cinza"] };
const idadeTxt = (d) => (Number.isInteger(d.idade) ? `${d.idade} ${d.idade === 1 ? "ano" : "anos"}` : "");
function abaPessoas() {
  corpo().appendChild(grupoOps([
    cartaoOp({ nome: "Desaparecimento", desc: "Registrar com o boletim", icone: "pessoa", dados: { acao: "desaparecido" }, aoTocar: () => registrarPessoa() }),
    cartaoOp({ nome: "Encontrei alguém perdido", desc: "Criança, idoso ou alguém confuso", icone: "lupa", dados: { acao: "acheiPessoa" }, aoTocar: () => acheiPessoa() })
  ], { colunas: 2, unico: false, rotulo: "Ações" }));
  corpo().appendChild(h("p", "ent-sub al-nota", "Não existe prazo de 24 h: registre na polícia na hora (190 ou Delegacia Virtual). A equipe confere o boletim antes de publicar."));
  const meus = secao("Seus avisos");
  const lm = h("div", "ent-lista"); meus.appendChild(lm);
  fb.getDocs(fb.query(fb.collection(fb.db, "desaparecidos"), fb.where("autorId", "==", eu.uid), fb.limit(10)))
    .then((s) => { const l = s.docs.map((d) => ({ id: d.id, ...d.data() })); lm.replaceChildren(...(l.length ? l.map((d) => linhaPessoa(d, true)) : [vazio("Nenhum aviso registrado.")])); })
    .catch(() => lm.replaceChildren(semLiberacao()));
  const area = secao("Desaparecidos perto de você");
  if (!perto()) { area.appendChild(vazio("Ative a localização para ver os avisos perto.")); return; }
  const la = h("div", "ent-lista"); area.appendChild(la);
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "desaparecidos"), fb.where("status", "==", "ativo"), fb.where("geo4", "in", perto()), fb.limit(40)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => d.autorId !== eu.uid).sort((a, b) => ms(b.quando) - ms(a.quando));
    la.replaceChildren(...(l.length ? l.map((d) => linhaPessoa(d, false)) : [vazio("Nenhum desaparecido perto agora.")]));
  }, () => la.replaceChildren(vazio("Indisponível no momento."))));
}
function linhaPessoa(d, meu) {
  const b = h("button", "ent-item al-item"); b.type = "button"; b.dataset.desaparecido = d.id;
  const lin = h("div", "lin");
  const tx = h("span", "pr-tx");
  tx.append(h("b", null, d.nome || "Pessoa"), h("small", null, [idadeTxt(d), `desde ${dataCurta(d.quando)}`, d.visto, pos && Number.isFinite(d.lat) ? km(distKm(pos, d)) : ""].filter(Boolean).join(" · ")));
  const st = STATUS_DESAP[d.status] || STATUS_DESAP.ativo;
  lin.append(fotoOuEmoji(d.foto, "", "pessoa"), tx, h("span", "ent-etq " + st[1], meu ? st[0] : (CONDICOES[d.condicao]?.[0] || st[0])));
  b.appendChild(lin);
  b.addEventListener("click", () => abrirPessoa(d.id));
  return b;
}
function registrarPessoa() {
  const { corpo: c, fechar, folha } = abrirTela("Registrar desaparecimento");
  const st = { condicao: "", parentesco: "", sexo: "", foto: "" };
  passoNum(c, 1, "Quem é");
  const fotoBox = h("div", "al-pfoto");
  const prev = h("label", "al-pfoto-prev"); const inp = h("input"); inp.type = "file"; inp.accept = "image/*"; inp.id = "alDesFoto";
  const pintarFoto = () => { prev.replaceChildren(fotoOuEmoji(st.foto, "", "pessoa"), inp); };
  inp.addEventListener("change", async () => { const f = inp.files?.[0]; inp.value = ""; if (!f) return; try { st.foto = await reduzirFoto(f); pintarFoto(); folha.marcarMexido?.(); } catch { toast("Não foi possível usar essa foto."); } });
  pintarFoto();
  const campos = h("div", "al-pfoto-campos");
  const campo = (rot, id, { max = 80, modo = "text", ph = "" } = {}) => { const l = h("label", "ent-campo"); const i = h("input"); i.id = id; i.maxLength = max; i.inputMode = modo; i.placeholder = ph; l.append(h("span", null, rot), i); campos.appendChild(l); return i; };
  const nome = campo("Nome completo", "alDesNome", { ph: "Como a pessoa se chama" });
  const idade = campo("Idade", "alDesIdade", { max: 3, modo: "numeric", ph: "Ex.: 8" });
  fotoBox.append(prev, campos); c.appendChild(fotoBox);
  c.appendChild(h("small", "al-pfoto-dica", "Toque no quadrado para pôr uma foto recente (o rosto bem visível)."));
  c.appendChild(grupoOps(Object.entries(CONDICOES).map(([k, [n]]) => cartaoOp({ nome: n, icone: "pessoa", dados: { condicao: k }, aoTocar: () => { st.condicao = k; folha.marcarMexido?.(); } })), { colunas: 2, rotulo: "Situação" }));
  passoNum(c, 2, "Como ela é");
  const desc = h("textarea"); desc.id = "alDesDesc"; desc.maxLength = 500; desc.placeholder = "Altura, cabelo, pele, roupa que usava, mochila...";
  const ld = h("label", "ent-campo"); ld.append(h("span", null, "Descrição"), desc); c.appendChild(ld);
  const sin = h("input"); sin.id = "alDesSinais"; sin.maxLength = 300; sin.placeholder = "Cicatriz, tatuagem, óculos, jeito de falar...";
  const ls = h("label", "ent-campo"); ls.append(h("span", null, "Sinais particulares (opcional)"), sin); c.appendChild(ls);
  passoNum(c, 3, "Quando e onde foi vista");
  const dois = (n) => String(n).padStart(2, "0"); const hoje = new Date(), diaTxt = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
  const dia = h("input"); dia.type = "date"; dia.id = "alDesDia"; dia.value = diaTxt(hoje); dia.max = dia.value; dia.min = diaTxt(new Date(Date.now() - 365 * 864e5));
  const hora = h("input"); hora.type = "time"; hora.id = "alDesHora"; hora.value = `${dois(hoje.getHours())}:${dois(hoje.getMinutes())}`;
  const lq = h("div", "ent-duplo"); const l1 = h("label", "ent-campo"); l1.append(h("span", null, "Dia"), dia); const l2 = h("label", "ent-campo"); l2.append(h("span", null, "Hora"), hora); lq.append(l1, l2); c.appendChild(lq);
  const visto = h("input"); visto.id = "alDesVisto"; visto.maxLength = 120; visto.placeholder = "Rua, bairro ou ponto de referência";
  const lv = h("label", "ent-campo"); lv.append(h("span", null, "Visto por último em"), visto); c.appendChild(lv);
  passoNum(c, 4, "Você e o boletim");
  c.appendChild(grupoOps(Object.entries(PARENTESCOS_DESAP).map(([k, n]) => cartaoOp({ nome: n, icone: "pessoas", dados: { parentesco: k }, aoTocar: () => { st.parentesco = k; folha.marcarMexido?.(); } })), { colunas: 2, rotulo: "Você é" }));
  const bo = h("input"); bo.id = "alDesBo"; bo.maxLength = 40; bo.placeholder = "Número do boletim de ocorrência";
  const lb = h("label", "ent-campo"); lb.append(h("span", null, "Boletim de ocorrência (obrigatório)"), bo); c.appendChild(lb);
  const lc = h("label", "ent-check"); const ck = h("input"); ck.type = "checkbox"; ck.id = "alDesDeclaro";
  lc.append(ck, h("span", null, "Declaro que sou parente ou responsável e que o desaparecimento foi registrado na polícia. Aviso falso leva a banimento e pode ser crime.")); c.appendChild(lc);
  const ok = botao("Enviar para a equipe conferir", "ent-btn", async () => {
    const n = nome.value.trim(), ida = idade.value.trim() === "" ? null : Number(idade.value);
    if (n.length < 3) { toast("Escreva o nome da pessoa."); nome.focus(); return; }
    if (ida !== null && !(Number.isInteger(ida) && ida >= 0 && ida <= 120)) { toast("Confira a idade."); idade.focus(); return; }
    if (!st.condicao) { toast("Escolha a situação da pessoa."); return; }
    if (desc.value.trim().length < 10) { toast("Descreva a pessoa com pelo menos 10 letras."); desc.focus(); return; }
    if (!st.parentesco) { toast("Diga quem você é para a pessoa."); return; }
    const nbo = bo.value.trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9./-]{4,40}$/.test(nbo)) { toast("Informe o número do boletim de ocorrência."); bo.focus(); return; }
    if (!ck.checked) { toast("Marque a declaração para continuar."); return; }
    ok.disabled = true;
    const g = await lerGps(8000) || pos;
    if (!g) { ok.disabled = false; toast("Ative a localização para marcar a região."); return; }
    const ref = fb.doc(fb.collection(fb.db, "desaparecidos"));
    const doc = {
      autorId: eu.uid, autorNome: String(dados.nome || "").slice(0, 80), nome: n.slice(0, 80), ...(ida !== null ? { idade: ida } : {}),
      condicao: st.condicao, parentesco: st.parentesco, descricao: desc.value.trim().slice(0, 500), sinais: sin.value.trim().slice(0, 300),
      visto: visto.value.trim().slice(0, 120), quando: fb.Timestamp.fromMillis(Math.min(Date.now() - 1000, new Date(`${dia.value}T${hora.value || "12:00"}`).getTime() || Date.now() - 1000)),
      bo: nbo, lat: Math.round(g.lat * 1e3) / 1e3, lng: Math.round(g.lng * 1e3) / 1e3, geo4: geohash(g.lat, g.lng, 4),
      cidade: String(dados.cidade || "").slice(0, 60), uf: /^[A-Z]{2}$/.test(dados.uf || "") ? dados.uf : "",
      status: "analise", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ...(st.foto ? { foto: st.foto } : {})
    };
    try {
      await fb.setDoc(ref, doc);
      // Chamado URGENTE na fila de Segurança para a equipe conferir o boletim e publicar.
      const sref = fb.doc(fb.collection(fb.db, "suporte")); const lote = fb.writeBatch(fb.db);
      lote.set(sref, { prioridade: "urgente", uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), assunto: `Desaparecimento: ${n}`.slice(0, 120), categoria: "sos", status: "aberto", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
      lote.set(fb.doc(fb.db, "suporte", sref.id, "mensagens", "inicio"), { autorId: eu.uid, equipe: false, texto: `DESAPARECIMENTO · conferir e publicar\nPessoa: ${n}${ida !== null ? ", " + ida + " anos" : ""} (${CONDICOES[st.condicao][0]})\nBoletim: ${nbo}\nQuem registrou: ${PARENTESCOS_DESAP[st.parentesco]}\nPainel › Segurança e alertas › Desaparecidos`.slice(0, 2000), em: fb.serverTimestamp() });
      lote.commit().catch(() => {});
      fechar(); toast("Enviado. A equipe confere o boletim e publica o aviso.");
      if (aba === "pets") pintarAba();
    } catch (e) { ok.disabled = false; toast(e?.code === "permission-denied" ? "Esta função ainda está sendo liberada." : "Não foi possível: " + erroAmigavel(e)); }
  });
  ok.id = "alDesOk";
  c.appendChild(ok);
}
async function abrirPessoa(id) {
  const { corpo: c, fechar } = abrirTela("Desaparecido");
  try {
    const s = await fb.getDoc(fb.doc(fb.db, "desaparecidos", id));
    if (!s.exists()) { c.appendChild(vazio("Aviso não encontrado.")); return; }
    const d = { id, ...s.data() };
    const meu = d.autorId === eu.uid;
    const cart = h("div", "al-pessoa"); cart.append(fotoOuEmoji(d.foto, "", "pessoa"), h("div"));
    const st = STATUS_DESAP[d.status] || STATUS_DESAP.ativo;
    cart.lastChild.append(h("b", null, d.nome), h("small", null, [idadeTxt(d), CONDICOES[d.condicao]?.[0]].filter(Boolean).join(" · ")), h("span", "ent-etq " + st[1], st[0]));
    c.appendChild(cart);
    const info = h("dl", "al-dl");
    const lin = (a, b) => { if (b) info.append(h("dt", null, a), h("dd", null, b)); };
    lin("Visto por último", [d.visto, new Date(ms(d.quando)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })].filter(Boolean).join(" · "));
    lin("Como é", d.descricao); lin("Sinais", d.sinais); lin("Região", [d.cidade, d.uf].filter(Boolean).join("/"));
    c.appendChild(info);
    if (meu) {
      if (d.status === "analise") c.appendChild(h("p", "ent-sub", "A equipe está conferindo o boletim. Assim que publicar, o aviso aparece para quem está perto."));
      if (["analise", "ativo"].includes(d.status)) c.appendChild(botao(`${d.nome.split(" ")[0]} foi encontrado(a)`, "ent-btn ok", async () => {
        try { await fb.updateDoc(fb.doc(fb.db, "desaparecidos", id), { status: "encontrado", atualizadoEm: fb.serverTimestamp() }); toast("Que alívio! Aviso encerrado."); fechar(); pintarAba(); } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
      }));
      c.appendChild(h("h3", null, "Pistas recebidas"));
      const lp = h("div", "ent-lista"); c.appendChild(lp);
      try {
        const ps = await fb.getDocs(fb.query(fb.collection(fb.db, "desaparecidos", id, "pistas"), fb.limit(50)));
        const l = ps.docs.map((x) => x.data()).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
        lp.replaceChildren(...(l.length ? l.map((p) => { const it = h("div", "ent-item"); it.append(h("b", null, p.anonimo ? "Pista anônima" : p.nome || "Alguém"), h("small", null, dataCurta(p.criadoEm)), h("span", null, p.texto)); if (Number.isFinite(p.lat)) { const a = h("a", "ent-btn sec", "Ver no mapa"); a.href = `https://www.google.com/maps?q=${p.lat},${p.lng}`; a.target = "_blank"; a.rel = "noopener"; it.appendChild(a); } return it; }) : [vazio("Nenhuma pista ainda.")]));
      } catch { lp.replaceChildren(vazio("Não foi possível ler as pistas.")); }
      return;
    }
    if (d.status === "ativo") {
      c.appendChild(h("p", "ent-sub", "Viu esta pessoa? Não a aborde à força. Se ela estiver em perigo, ligue 190."));
      const bt = botao("Vi esta pessoa", "ent-btn", () => pistaPessoa(d)); bt.id = "alDesVi"; c.appendChild(bt);
    }
  } catch { c.appendChild(vazio("Indisponível no momento.")); }
}
function pistaPessoa(d) {
  const { corpo: c, fechar } = abrirTela(`Vi ${d.nome.split(" ")[0]}`);
  const t = h("textarea"); t.id = "alDesPista"; t.maxLength = 400; t.placeholder = "Onde, quando e como ela estava";
  const l = h("label", "ent-campo"); l.append(h("span", null, "O que você viu"), t); c.appendChild(l);
  const lg = h("label", "ent-check"); const cg = h("input"); cg.type = "checkbox"; cg.checked = true; cg.id = "alDesPistaLocal"; lg.append(cg, h("span", null, "Mandar a minha localização aproximada (cerca de 100 m)")); c.appendChild(lg);
  const la = h("label", "ent-check"); const ca = h("input"); ca.type = "checkbox"; ca.checked = true; ca.id = "alDesPistaAnonima"; la.append(ca, h("span", null, "Sem o meu nome (anônima). A equipe sabe quem mandou.")); c.appendChild(la);
  const ok = botao("Enviar pista à família", "ent-btn", async () => {
    if (t.value.trim().length < 3) { toast("Escreva o que você viu."); return; }
    ok.disabled = true;
    const g = cg.checked ? await lerGps(8000) || pos : null;
    const ref = fb.doc(fb.collection(fb.db, "desaparecidos", d.id, "pistas"));
    const base = { texto: t.value.trim().slice(0, 400), criadoEm: fb.serverTimestamp(), ...(g ? { lat: Math.round(g.lat * 1e3) / 1e3, lng: Math.round(g.lng * 1e3) / 1e3 } : {}) };
    try {
      const lote = fb.writeBatch(fb.db);
      if (ca.checked) { lote.set(ref, { ...base, anonimo: true }); lote.set(fb.doc(fb.db, "pistas_desap_autoria", `${d.id}_${ref.id}`), { uid: eu.uid }); }
      else lote.set(ref, { ...base, anonimo: false, uid: eu.uid, nome: String(dados.nome || "").slice(0, 80) });
      await lote.commit();
      toast("Pista enviada. Obrigado!"); fechar();
    } catch (e) { ok.disabled = false; toast("Não foi possível: " + erroAmigavel(e)); }
  });
  ok.id = "alDesPistaOk";
  c.appendChild(ok);
}
function acheiPessoa() {
  const { corpo: c } = abrirTela("Encontrei alguém perdido");
  const ul = h("ol", "al-passos");
  ["Fique com a pessoa num lugar público e seguro. Não leve para casa.", "Ligue 190 (polícia). Se for criança, a polícia aciona o Conselho Tutelar; se ela precisar de atendimento, 192.", "Não publique a foto dela em redes sociais.", "Veja abaixo se ela está nos avisos perto e mande uma pista à família."].forEach((x) => ul.appendChild(h("li", null, x)));
  c.appendChild(ul);
  const tel = h("a", "ent-btn al-btn-sos"); tel.href = "tel:190"; tel.textContent = "Ligar 190"; c.appendChild(tel);
  c.appendChild(h("h3", null, "Desaparecidos perto"));
  const l = h("div", "ent-lista"); c.appendChild(l);
  if (!perto()) { l.appendChild(vazio("Ative a localização para ver os avisos perto.")); return; }
  fb.getDocs(fb.query(fb.collection(fb.db, "desaparecidos"), fb.where("status", "==", "ativo"), fb.where("geo4", "in", perto()), fb.limit(40)))
    .then((s) => { const lista = s.docs.map((d) => ({ id: d.id, ...d.data() })); l.replaceChildren(...(lista.length ? lista.map((d) => linhaPessoa(d, false)) : [vazio("Nenhum aviso perto. Siga os passos acima.")])); })
    .catch(() => l.replaceChildren(vazio("Indisponível no momento.")));
}
function opcoesMeuPet(p) {
  const { corpo: c, fechar } = abrirTela(p.nome || "Pet");
  c.appendChild(cartaoRg(p));
  if (p.status === "perdido") {
    c.append(botao(`${p.nome} voltou para casa`, "ent-btn ok", async () => { try { await fb.updateDoc(fb.doc(fb.db, "pets", p.id), { status: "casa", atualizadoEm: fb.serverTimestamp() }); toast("Que alegria!"); fechar(); } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); } }),
      botao("Ver animais encontrados parecidos", "ent-btn sec", () => procurarAchados(p, false)));
  } else c.appendChild(botao(`${p.nome} sumiu: avisar que está perdido`, "ent-btn al-btn-sos", () => marcarPerdido(p, fechar)));
  c.append(botao("Editar", "ent-btn sec", () => { fechar(); editarPet(p); }),
    botao("Apagar o cadastro", "ent-btn perigo", () => confirmarHF({ titulo: "Apagar o RG do pet?", ok: "Apagar", icone: "lixo", aoConfirmar: async () => { await fb.deleteDoc(fb.doc(fb.db, "pets", p.id)); fechar(); } })));
}
function cartaoRg(p) {
  const card = h("div", "al-rg");
  const cab = h("div", "al-rg-cab"); cab.append(h("b", null, "RG DO PET"), h("small", null, rgPet(p.id)));
  const meio = h("div", "al-rg-meio");
  const dadosRg = h("div");
  const lin = (a, b) => { if (b) { const d = h("div"); d.append(h("small", null, a), h("b", null, b)); dadosRg.appendChild(d); } };
  lin("Nome", p.nome); lin("Espécie", ESPECIES[p.especie]?.[0]); lin("Raça", p.raca); lin("Cores", (p.cores || []).join(", ")); lin("Porte", nomePorte(p.especie, p.porte)); lin("Sexo", p.sexo === "m" ? "Macho" : p.sexo === "f" ? "Fêmea" : ""); lin("Microchip", p.microchip); lin("Sinais", p.sinais); lin("Tutor", (p.donoNome || "").split(" ")[0]);
  meio.append(fotoOuEmoji(p.foto, p.especie), dadosRg);
  const qr = h("div", "al-rg-qr");
  import("./qr.js?v=1").then(async (m) => { const svg = await m.qrSvg(`https://helpfloripa.com.br/alertas.html?pet=${p.id}`, "QR do RG do pet"); if (svg) { qr.innerHTML = ""; qr.appendChild(typeof svg === "string" ? Object.assign(document.createElement("div"), { innerHTML: svg }).firstChild : svg); } }).catch(() => {});
  card.append(cab, meio, qr, h("small", "al-rg-rod", "Achou este pet? Leia o QR ou procure o RG em Help Floripa › Help e alertas › Pets."));
  return card;
}
async function marcarPerdido(p, fecharAntes) {
  const { corpo: c, fechar } = abrirTela(`${p.nome} sumiu`);
  c.appendChild(h("p", "ent-sub", "Quem estiver perto vê o aviso, e quem publicar que encontrou um animal parecido é ligado a você."));
  const nome = h("input"); nome.placeholder = "Rua, bairro ou ponto de referência"; nome.id = "alPerdidoOnde"; nome.maxLength = 120;
  const l = h("label", "ent-campo"); l.append(h("span", null, "Onde foi visto por último"), nome); c.appendChild(l);
  c.appendChild(h("p", "ent-sub", "Usamos a sua localização atual como o ponto aproximado (você pode estar no lugar ou perto dele)."));
  const ok = botao("Avisar que está perdido", "ent-btn al-btn-sos", async () => {
    ok.disabled = true;
    const g = await lerGps(8000) || pos;
    if (!g) { ok.disabled = false; toast("Ative a localização para marcar onde ele sumiu."); return; }
    const local = { lat: Math.round(g.lat * 1e4) / 1e4, lng: Math.round(g.lng * 1e4) / 1e4, nome: nome.value.trim().slice(0, 120) };
    try {
      await fb.updateDoc(fb.doc(fb.db, "pets", p.id), { status: "perdido", perdidoEm: fb.serverTimestamp(), perdidoLocal: local, geo4: geohash(g.lat, g.lng, 4), visivel: true, atualizadoEm: fb.serverTimestamp() });
      fechar(); fecharAntes?.(); toast("Aviso publicado. Procurando animais encontrados parecidos...");
      procurarAchados({ ...p, status: "perdido", perdidoEm: Date.now(), perdidoLocal: local, geo4: geohash(g.lat, g.lng, 4) }, true);
    } catch (e) { ok.disabled = false; toast("Não foi possível: " + erroAmigavel(e)); }
  });
  ok.id = "alPerdidoOk";
  c.appendChild(ok);
}
// Dono procurando: animais encontrados perto (e com o mesmo microchip), ordenados pela semelhança.
async function procurarAchados(p, avisar) {
  const { corpo: c } = abrirTela(`Parecidos com ${p.nome}`);
  c.appendChild(vazio("Procurando..."));
  const col = fb.collection(fb.db, "pets_achados");
  const consultas = [];
  if (p.geo4 || p.perdidoLocal) { const base = p.perdidoLocal || pos; if (base) consultas.push(fb.query(col, fb.where("status", "==", "ativo"), fb.where("geo4", "in", vizinhos(base.lat, base.lng, 4)), fb.limit(60))); }
  if (p.microchip) consultas.push(fb.query(col, fb.where("microchip", "==", p.microchip), fb.limit(10)));
  const docs = new Map();
  for (const q of consultas) { try { (await fb.getDocs(q)).docs.forEach((d) => docs.set(d.id, { id: d.id, ...d.data() })); } catch {} }
  const lista = [...docs.values()].filter((a) => a.status === "ativo").map((a) => ({ a, n: semelhanca(p, a) })).filter((x) => x.n >= MOSTRAR_A_PARTIR).sort((x, y) => y.n - x.n);
  c.replaceChildren();
  if (!lista.length) { c.appendChild(vazio("Ainda nenhum animal encontrado parecido. Quando alguém publicar um, você é avisado no Mensagens.")); return; }
  for (const { a, n } of lista.slice(0, 20)) {
    const li = linhaAchado(a);
    li.querySelector(".lin").appendChild(h("span", "ent-etq " + (n >= AVISO_AUTOMATICO ? "verde" : "amarelo"), `${textoSemelhanca(n)} · ${n}%`));
    c.appendChild(li);
    if (avisar && n >= AVISO_AUTOMATICO && a.autorId !== eu.uid) avisarPar(a.autorId, { acao: "dono", petId: p.id, achadoId: a.id, nota: n, nome: p.nome }, `Pet: pode ser o pet de ${(dados.nome || "alguém").split(" ")[0]}`);
  }
}
const avisados = new Set();
function avisarPar(uid, cartao, resumo) {
  const k = `${uid}:${cartao.achadoId}:${cartao.petId}`;
  if (avisados.has(k) || !uid || uid === eu.uid) return;
  avisados.add(k);
  // conversa do pet: com quem achou (achado) ou com o tutor do pet perdido (pet) vai direto; as regras conferem
  const servico = cartao.acao === "dono" ? { tipo: "achado", id: cartao.achadoId } : { tipo: "pet", id: cartao.petId };
  mandarMensagem(uid, { tipoArquivo: "cartao", cartao: { tipo: "pet", ...cartao } }, resumo, { servico }).catch(() => {});
}
function achei() {
  abrirCadastroPet({ fb, uid: eu.uid, dados, pos, toast, modo: "achado", aoEnviar: async (v) => {
    const g = await lerGps(8000) || pos;
    if (!g) { toast("Ative a localização para marcar onde encontrou."); return false; }
    const { onde, ...resto } = v;
    const local = { lat: Math.round(g.lat * 1e4) / 1e4, lng: Math.round(g.lng * 1e4) / 1e4, nome: onde || "" };
    try {
      const ref = await fb.addDoc(fb.collection(fb.db, "pets_achados"), { ...resto, autorId: eu.uid, autorNome: String(dados.nome || "").slice(0, 80), local, geo4: geohash(g.lat, g.lng, 4), quando: fb.serverTimestamp(), status: "ativo", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() });
      toast("Publicado! Procurando o tutor...");
      procurarTutores({ id: ref.id, ...resto, local, geo4: geohash(g.lat, g.lng, 4), quando: Date.now() });
      return true;
    } catch (e) { toast(e?.code === "permission-denied" ? "Esta função ainda está sendo liberada." : "Não foi possível: " + erroAmigavel(e)); return false; }
  } });
}
// Quem achou: pets perdidos perto (e com o mesmo microchip, mesmo em casa), ordenados pela semelhança; avisa os mais parecidos.
async function procurarTutores(a) {
  const { corpo: c } = abrirTela("Possíveis tutores");
  c.appendChild(vazio("Procurando..."));
  const col = fb.collection(fb.db, "pets");
  const consultas = [fb.query(col, fb.where("visivel", "==", true), fb.where("status", "==", "perdido"), fb.where("geo4", "in", vizinhos(a.local.lat, a.local.lng, 4)), fb.limit(60))];
  if (a.microchip) consultas.push(fb.query(col, fb.where("visivel", "==", true), fb.where("microchip", "==", a.microchip), fb.limit(5)));
  const docs = new Map();
  for (const q of consultas) { try { (await fb.getDocs(q)).docs.forEach((d) => docs.set(d.id, { id: d.id, ...d.data() })); } catch {} }
  const lista = [...docs.values()].filter((p) => p.donoId !== eu.uid).map((p) => ({ p, n: semelhanca(p, a) })).filter((x) => x.n >= MOSTRAR_A_PARTIR).sort((x, y) => y.n - x.n);
  c.replaceChildren();
  if (!lista.length) { c.appendChild(vazio("Nenhum pet perdido parecido por enquanto. Seu aviso fica publicado: quando o tutor marcar o pet como perdido, ele vê o seu.")); return; }
  c.appendChild(h("p", "ent-sub", "Avisamos no Mensagens os tutores dos pets mais parecidos. Você também pode avisar os outros."));
  for (const { p, n } of lista.slice(0, 20)) {
    const li = linhaPet(p, false);
    li.querySelector(".lin").appendChild(h("span", "ent-etq " + (n >= AVISO_AUTOMATICO ? "verde" : "amarelo"), `${textoSemelhanca(n)} · ${n}%`));
    c.appendChild(li);
    const card = { acao: "achado", petId: p.id, achadoId: a.id, nota: n, nome: p.nome };
    if (n >= AVISO_AUTOMATICO) avisarPar(p.donoId, card, `Pet: encontraram um animal parecido com ${p.nome}`);
    else c.appendChild(botao(`Avisar o tutor de ${p.nome}`, "ent-btn sec", (e) => { avisarPar(p.donoId, card, `Pet: encontraram um animal parecido com ${p.nome}`); e.currentTarget.disabled = true; toast("Tutor avisado"); }));
  }
}
async function abrirRg(id) {
  const { corpo: c } = abrirTela("RG do pet");
  try {
    const d = await fb.getDoc(fb.doc(fb.db, "pets", id));
    if (!d.exists()) { c.appendChild(vazio("Pet não encontrado.")); return; }
    const p = { id, ...d.data() };
    c.appendChild(cartaoRg(p));
    if (p.status === "perdido") c.appendChild(h("div", "al-estado vermelho", `Perdido desde ${dataCurta(p.perdidoEm)}${p.perdidoLocal?.nome ? " · " + p.perdidoLocal.nome : ""}`));
    if (p.donoId !== eu.uid) c.appendChild(botao(p.status === "perdido" ? `Vi ${p.nome}! Avisar o tutor` : `Falar com o tutor de ${p.nome}`, "ent-btn", async () => {
      await mandarMensagem(p.donoId, { tipoArquivo: "cartao", cartao: { tipo: "pet", acao: "vi", petId: p.id, nome: p.nome } }, `Pet: vi o seu pet, ${p.nome}`, { servico: { tipo: "pet", id: p.id } }).catch(() => {});
      conversar(p.donoId, { tipo: "pet", id: p.id });
    }));
  } catch { c.appendChild(vazio("Você não tem acesso a este pet.")); }
}
async function abrirAchado(id) {
  const { corpo: c } = abrirTela("Animal encontrado");
  try {
    const d = await fb.getDoc(fb.doc(fb.db, "pets_achados", id));
    if (!d.exists()) { c.appendChild(vazio("Aviso não encontrado.")); return; }
    const a = { id, ...d.data() };
    const topo = h("div", "al-achado"); topo.append(fotoOuEmoji(a.foto, a.especie), h("div"));
    topo.lastChild.append(h("b", null, `${ESPECIES[a.especie]?.[0] || "Animal"} encontrado`), h("small", null, `${descricaoPet(a)}${a.sinais ? " · " + a.sinais : ""}`), h("small", null, `${a.local?.nome || "Local aproximado"} · ${dataCurta(a.quando || a.criadoEm)}${a.microchip ? " · microchip " + a.microchip : ""}`));
    c.appendChild(topo);
    if (a.status !== "ativo") c.appendChild(h("div", "al-estado verde", "Já voltou para casa"));
    if (a.autorId === eu.uid) {
      if (a.status === "ativo") c.append(botao("Já devolvi ao tutor", "ent-btn ok", async () => { await fb.updateDoc(fb.doc(fb.db, "pets_achados", id), { status: "devolvido", atualizadoEm: fb.serverTimestamp() }); toast("Obrigado!"); }),
        botao("Procurar o tutor de novo", "ent-btn sec", () => procurarTutores(a)));
      return;
    }
    // Meus pets parecidos com este.
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "pets"), fb.where("donoId", "==", eu.uid), fb.limit(20))).catch(() => null);
    const meus = (s?.docs || []).map((x) => ({ id: x.id, ...x.data() })).map((p) => ({ p, n: semelhanca(p, a) })).sort((x, y) => y.n - x.n);
    if (meus[0]?.n >= MOSTRAR_A_PARTIR) c.appendChild(h("div", "al-estado verde", `${textoSemelhanca(meus[0].n)} com ${meus[0].p.nome} (${meus[0].n}%)`));
    c.appendChild(botao("É o meu! Falar com quem encontrou", "ent-btn", async () => {
      if (meus[0]) await mandarMensagem(a.autorId, { tipoArquivo: "cartao", cartao: { tipo: "pet", acao: "dono", petId: meus[0].p.id, achadoId: a.id, nota: meus[0].n, nome: meus[0].p.nome } }, "Pet: acho que é o meu pet").catch(() => {});
      conversar(a.autorId, { tipo: "achado", id: a.id });
    }));
  } catch { c.appendChild(vazio("Indisponível agora.")); }
}

// =====================================================
// ROUBOS E FURTOS (18/11/2026: cartões no padrão do site, identificação conferida — IMEI pela soma, placa no padrão
// antigo ou Mercosul —, ocorrência repetida avisada e, para carro/moto, a busca de anúncios com a mesma placa)
// =====================================================
const TIPO_OC = { roubo: ["Roubo", "Com ameaça ou violência", "sirene"], furto: ["Furto", "Levaram sem ninguém ver", "cadeado"], golpe: ["Golpe", "Pix, venda falsa, link...", "anzol"], suspeita: ["Atividade suspeita", "Algo estranho na rua", "olho"] };
const OBJ_IC = { celular: "celular", bike: "bicicleta", carro: "carro", moto: "moto", notebook: "notebook", documento: "documento", pet: "pata", outro: "caixa" };
const OBJ_DESC = { celular: "Pelo IMEI", bike: "Número do quadro", carro: "Pela placa", moto: "Pela placa", notebook: "Número de série", documento: "RG, CNH, cartões", pet: "Cachorro, gato...", outro: "Outra coisa" };
const ehVeiculo = (o) => o === "carro" || o === "moto";
const PAGINA_VENDA = { lojinha: "shopping.html", automotivo: "automotivo.html" };
const linkVenda = (a) => `${PAGINA_VENDA[a.tipoNegocio] || "shopping.html"}?negocio=${encodeURIComponent(a.negocioId)}&de=alerta`;
function passoNum(c, n, t, sub) { const d = h("div", "pr-passo"); d.append(h("span", "pr-passo-n", String(n)), h("h3", null, t)); c.appendChild(d); if (sub) c.appendChild(h("p", "ent-sub", sub)); }

function abaRoubos() {
  corpo().appendChild(grupoOps([
    cartaoOp({ nome: "Registrar ocorrência", desc: "Roubo, furto ou golpe: avise a vizinhança e receba pistas", icone: "sirene", dados: { acao: "registrar" }, aoTocar: () => registrarOcorrencia() }),
    cartaoOp({ nome: "Consultar antes de comprar", desc: "Confira o IMEI, a placa ou o número de série de um usado", icone: "lupa", dados: { acao: "consultar" }, aoTocar: () => consultar("") })
  ], { colunas: 1, unico: false, rotulo: "Ações" }));
  corpo().appendChild(h("p", "ent-sub al-aviso-bo", "Registre também o boletim de ocorrência na polícia (Delegacia Virtual do seu estado). Aqui é para avisar a vizinhança e ajudar a recuperar."));
  const minhas = secao("Suas ocorrências");
  const lm = h("div", "ent-lista"); minhas.appendChild(lm);
  (async () => {
    const ids = new Set(Array.isArray(dados.minhasOcorrencias) ? dados.minhasOcorrencias : []);
    const l = [];
    try { (await fb.getDocs(fb.query(fb.collection(fb.db, "ocorrencias"), fb.where("autorId", "==", eu.uid), fb.limit(20)))).docs.forEach((d) => { ids.delete(d.id); l.push({ id: d.id, ...d.data() }); }); } catch {}
    for (const id of [...ids].slice(0, 20)) { try { const d = await fb.getDoc(fb.doc(fb.db, "ocorrencias", id)); if (d.exists()) l.push({ id, ...d.data() }); } catch {} }
    lm.replaceChildren(...(l.length ? l.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)).map((o) => linhaOcorrencia(o, true)) : [vazio("Nenhuma ocorrência registrada.")]));
  })();
  if (!cfg.roubosArea) return;
  const area = secao("Alertas perto de você", "Roubos, furtos e golpes dos últimos 30 dias.");
  if (!perto()) { area.appendChild(vazio("Ative a localização para ver os alertas perto de você.")); return; }
  const la = h("div", "ent-lista"); area.appendChild(la);
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "ocorrencias"), fb.where("status", "==", "ativo"), fb.where("geo4", "in", perto()), fb.limit(60)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => Date.now() - ms(o.quando) < 30 * 864e5 && (distKm(pos, o) ?? 0) <= Math.max(cfg.raio, 5)).sort((a, b) => ms(b.quando) - ms(a.quando));
    // Resumo do que mais acontece por perto (só com dados reais carregados agora).
    if (l.length >= 3) {
      const por = {}; l.forEach((o) => { const k = OBJETOS[o.objeto]?.[0] || "Outro"; por[k] = (por[k] || 0) + 1; });
      const top = Object.entries(por).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} (${n})`).join(", ");
      la.replaceChildren(h("p", "ent-sub al-resumo-area", `${l.length} alertas por perto. O que mais aparece: ${top}.`), ...l.map((o) => linhaOcorrencia(o, false)));
    } else la.replaceChildren(...(l.length ? l.map((o) => linhaOcorrencia(o, false)) : [vazio("Nenhum alerta perto nos últimos 30 dias.")]));
  }, () => la.replaceChildren(semLiberacao())));
}
function linhaOcorrencia(o, minha) {
  const b = h("button", "ent-item al-item"); b.type = "button"; b.dataset.ocorrencia = o.id;
  const lin = h("div", "lin");
  const tx = h("span", "pr-tx");
  const oque = ehVeiculo(o.objeto) && o.veiculo?.modelo ? `${OBJETOS[o.objeto][0]} ${[o.veiculo.marca, o.veiculo.modelo].filter(Boolean).join(" ")}` : OBJETOS[o.objeto]?.[0] || "objeto";
  tx.append(h("b", null, `${TIPOS_OCORRENCIA[o.tipo] || "Ocorrência"}: ${oque}`), h("small", null, `${[o.bairro, o.cidade].filter(Boolean).join(", ") || "Perto"} · ${dataCurta(o.quando)}${pos && Number.isFinite(o.lat) ? " · " + km(distKm(pos, o)) : ""}${o.anonimo ? " · anônima" : ""}`));
  lin.append(iconeEl(OBJ_IC[o.objeto] || "caixa", { tam: 20, fundo: true }), tx, h("span", "ent-etq " + (o.status === "ativo" ? "vermelho" : "verde"), o.status === "ativo" ? (minha ? "Ativa" : "Alerta") : o.status === "recuperado" ? "Recuperado" : "Encerrada"));
  b.appendChild(lin);
  b.appendChild(h("small", "pr-msg", o.descricao));
  b.addEventListener("click", () => abrirOcorrencia(o.id));
  return b;
}
// Campo de identificação que se ajusta ao objeto: IMEI conferido pela soma, placa no padrão antigo ou Mercosul.
function campoIdentificacao(objeto, inicial = "") {
  const l = h("label", "ent-campo"); const sp = h("span"); const i = h("input"); i.id = "alOcId"; i.maxLength = 40; i.autocomplete = "off"; i.value = inicial;
  const dica = h("small", "al-valida");
  l.append(sp, i, dica);
  const conf = { celular: ["IMEI (15 números)", "Disque *#06# no celular ou veja na caixa e na nota fiscal.", "numeric", "000000000000000"], bike: ["Número do quadro", "Fica gravado embaixo do pedivela, perto dos pedais.", "text", "Ex.: WTU123A4567"], carro: ["Placa", "Padrão antigo (ABC-1234) ou Mercosul (ABC1D23).", "text", "ABC1D23"], moto: ["Placa", "Padrão antigo (ABC-1234) ou Mercosul (ABC1D23).", "text", "ABC1D23"], notebook: ["Número de série", "Fica na etiqueta embaixo do aparelho ou nas configurações.", "text", "Número de série"], outro: ["Número de série (se tiver)", "Ajuda a recuperar e a evitar a revenda.", "text", "Número de série"] }[objeto];
  l.hidden = !conf;
  if (!conf) return { el: l, valor: () => "", ok: () => true };
  sp.textContent = conf[0]; i.inputMode = conf[2]; i.placeholder = conf[3];
  if (ehVeiculo(objeto)) { i.maxLength = 8; i.style.textTransform = "uppercase"; }
  const validar = () => {
    const v = i.value.trim();
    if (!v) { dica.textContent = conf[1]; dica.className = "al-valida"; return true; }
    let ok = true, msg = "";
    if (objeto === "celular") { ok = imeiOk(v); msg = ok ? "IMEI conferido." : /^\d{15}$/.test(v.replace(/\D/g, "")) ? "Esse IMEI não confere: algum número foi digitado errado." : `Faltam números (${v.replace(/\D/g, "").length} de 15).`; }
    else if (ehVeiculo(objeto)) { ok = placaOk(v); msg = ok ? `Placa ${formatarPlaca(v)}${placaAntiga(v) && normalizarPlaca(v) !== placaAntiga(v) ? ` (antiga: ${formatarPlaca(placaAntiga(v))})` : placaAntiga(v) ? ` (Mercosul: ${placaMercosul(v)})` : ""}.` : "Confira a placa: 3 letras, 1 número, 1 letra ou número e 2 números."; }
    else { ok = normalizarId(v).length >= 4; msg = ok ? "" : "Número muito curto."; }
    dica.textContent = msg || conf[1]; dica.className = "al-valida " + (ok ? "ok" : "erro");
    return ok;
  };
  i.addEventListener("input", () => { if (objeto === "celular") i.value = i.value.replace(/\D/g, "").slice(0, 15); validar(); });
  validar();
  return { el: l, input: i, valor: () => (ehVeiculo(objeto) ? placaMercosul(i.value) : objeto === "celular" ? i.value.replace(/\D/g, "") : normalizarId(i.value)), ok: validar };
}
function camposVeiculo(v = {}) {
  const box = h("div", "al-vei-campos");
  const campo = (rot, id, val, { lista = "", max = 40, modo = "text", ph = "" } = {}) => { const l = h("label", "ent-campo"); const i = h("input"); i.id = id; i.value = val || ""; i.maxLength = max; i.inputMode = modo; i.placeholder = ph; if (lista) i.setAttribute("list", lista); l.append(h("span", null, rot), i); box.appendChild(l); return i; };
  const tipo = v.tipo === "moto" ? "moto" : "carro";
  const dl = (id, itens) => { if (document.getElementById(id)) return; const d = h("datalist"); d.id = id; itens.forEach((x) => { const o = h("option"); o.value = x; d.appendChild(o); }); document.body.appendChild(d); };
  dl("alMarcasCarro", MARCAS.carro); dl("alMarcasMoto", MARCAS.moto); dl("alCoresVei", CORES_VEICULO);
  const r = {
    marca: campo("Marca", "alVeiMarca", v.marca, { lista: tipo === "moto" ? "alMarcasMoto" : "alMarcasCarro", max: 30, ph: tipo === "moto" ? "Ex.: Honda" : "Ex.: Fiat" }),
    modelo: campo("Modelo", "alVeiModelo", v.modelo, { max: 40, ph: tipo === "moto" ? "Ex.: CG 160 Fan" : "Ex.: Uno Way" }),
    ano: campo("Ano", "alVeiAno", v.ano, { max: 4, modo: "numeric", ph: "2018" }),
    cor: campo("Cor", "alVeiCor", v.cor, { lista: "alCoresVei", max: 20, ph: "Ex.: Prata" })
  };
  box.className = "ent-duplo al-vei-campos";
  return { el: box, ler: () => ({ marca: r.marca.value.trim().slice(0, 30), modelo: r.modelo.value.trim().slice(0, 40), ano: /^\d{4}$/.test(r.ano.value.trim()) ? r.ano.value.trim() : "", cor: r.cor.value.trim().slice(0, 20) }), tipo: (t) => { r.marca.setAttribute("list", t === "moto" ? "alMarcasMoto" : "alMarcasCarro"); } };
}
function registrarOcorrencia(pre = {}) {
  const { corpo: c, fechar, folha } = abrirTela("Registrar ocorrência");
  const st = { tipo: pre.tipo || "furto", objeto: pre.objeto || "celular", anonimo: true, veiculoDoc: pre.veiculo || null };
  passoNum(c, 1, "O que aconteceu");
  c.appendChild(grupoOps(Object.entries(TIPO_OC).map(([k, [n, d, i]]) => cartaoOp({ nome: n, desc: d, icone: i, ativo: st.tipo === k, dados: { tipo: k }, classe: k === "roubo" ? "perigo" : "", aoTocar: () => { st.tipo = k; folha.marcarMexido?.(); } })), { colunas: 2, rotulo: "O que aconteceu" }));
  passoNum(c, 2, "O que foi levado");
  c.appendChild(grupoOps(Object.entries(OBJETOS).map(([k, [n]]) => cartaoOp({ nome: n, desc: OBJ_DESC[k], icone: OBJ_IC[k], ativo: st.objeto === k, dados: { objeto: k }, aoTocar: () => { if (st.objeto !== k) st.veiculoDoc = null; st.objeto = k; pintarId(); folha.marcarMexido?.(); } })), { colunas: 2, rotulo: "O que foi levado" }));
  passoNum(c, 3, "Identificação", "É o que faz o Help Floripa achar o objeto depois: quem for comprar consulta e, se for carro ou moto, a loja não consegue anunciar.");
  const caixaId = h("div", "al-id"); c.appendChild(caixaId);
  let idAtual = null, veiAtual = null;
  const pintarId = async () => {
    caixaId.replaceChildren();
    const o = st.objeto;
    if (o === "pet") {
      const n = h("div", "ent-nota"); n.append(ic("ajuda"), h("span", null, "Se é o seu pet, use a aba Pets: marque como perdido e o Help Floripa cruza com os animais encontrados perto."));
      caixaId.append(n, botao("Ir para Pets", "ent-btn sec", () => { fechar(); aba = "pets"; pintarAba(); }));
    }
    if (o === "documento") { const n = h("div", "ent-nota"); n.append(ic("ajuda"), h("span", null, "Não coloque o número dos documentos. Bloqueie os cartões pelo app do banco e peça a segunda via.")); caixaId.appendChild(n); }
    if (ehVeiculo(o)) {
      const meus = (await lerMeusVeiculos().catch(() => [])).filter((v) => v.tipo === o);
      if (meus.length) {
        caixaId.appendChild(h("h4", "op-sec", "Seus veículos"));
        caixaId.appendChild(grupoOps(meus.map((v) => cartaoOp({ nome: nomeVeiculo(v), desc: `${formatarPlaca(v.placa)}${v.cor ? " · " + v.cor : ""}`, icone: v.tipo, ativo: st.veiculoDoc?.id === v.id, dados: { veiculo: v.id }, aoTocar: () => { st.veiculoDoc = v; pintarId(); } })), { colunas: 1 }));
      }
    }
    idAtual = campoIdentificacao(o, st.veiculoDoc ? formatarPlaca(st.veiculoDoc.placa) : "");
    caixaId.appendChild(idAtual.el);
    veiAtual = ehVeiculo(o) ? camposVeiculo(st.veiculoDoc || { tipo: o }) : null;
    if (veiAtual) caixaId.appendChild(veiAtual.el);
  };
  pintarId();
  passoNum(c, 4, "Como foi");
  const desc = h("textarea"); desc.id = "alOcDesc"; desc.maxLength = 500; desc.placeholder = "Como foi, marca/modelo, cor, características. Não coloque dados pessoais de ninguém.";
  const ld = h("label", "ent-campo"); ld.append(h("span", null, "Descrição"), desc); c.appendChild(ld);
  // Quando: dia e hora em campos separados (campos.js abre o calendário e o relógio do site, sem a tela do celular).
  const dois = (n) => String(n).padStart(2, "0");
  const hoje = new Date(), diaTxt = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
  const dia = h("input"); dia.type = "date"; dia.id = "alOcDia"; dia.value = diaTxt(hoje); dia.max = dia.value; dia.min = diaTxt(new Date(Date.now() - 60 * 864e5));
  const horaI = h("input"); horaI.type = "time"; horaI.id = "alOcHora"; horaI.value = `${dois(hoje.getHours())}:${dois(hoje.getMinutes())}`;
  const lq = h("div", "ent-duplo");
  const ld1 = h("label", "ent-campo"); ld1.append(h("span", null, "Dia"), dia);
  const ld2 = h("label", "ent-campo"); ld2.append(h("span", null, "Hora (aproximada)"), horaI);
  lq.append(ld1, ld2); c.appendChild(lq);
  const bairro = h("input"); bairro.id = "alOcBairro"; bairro.maxLength = 60; bairro.value = dados.bairro || "";
  const lb = h("label", "ent-campo"); lb.append(h("span", null, "Bairro"), bairro); c.appendChild(lb);
  c.appendChild(h("p", "ent-sub", "O ponto no mapa é aproximado (cerca de 100 m), a partir da sua localização."));
  passoNum(c, 5, "Quem aparece");
  const lan = h("label", "ent-check"); const can = h("input"); can.type = "checkbox"; can.checked = true; can.id = "alOcAnonimo";
  can.addEventListener("change", () => (st.anonimo = can.checked));
  lan.append(can, h("span", null, "Publicar sem o meu nome (anônima). Só a moderação sabe quem registrou.")); c.appendChild(lan);
  const ok = botao("Registrar e avisar a vizinhança", "ent-btn", async () => {
    const d = desc.value.trim();
    if (idAtual && !idAtual.ok()) { toast(st.objeto === "celular" ? "Confira o IMEI: 15 números (*#06# no celular)." : "Confira a placa (ABC-1234 ou ABC1D23)."); idAtual.input?.focus(); return; }
    if (!idAtual) return;
    const ident = idAtual.valor();
    if (ehVeiculo(st.objeto) && !ident) { toast("Para carro ou moto, a placa é obrigatória: é por ela que o Help Floripa procura o veículo."); idAtual.input?.focus(); return; }
    if (d.length < 10) { toast("Descreva com pelo menos 10 letras."); desc.focus(); return; }
    ok.disabled = true;
    // Já existe ocorrência ativa com o mesmo número? (outra pessoa já registrou, ou é repetida)
    if (ident) {
      try {
        const formas = ehVeiculo(st.objeto) ? formasPlaca(ident) : [ident];
        const s = await fb.getDocs(fb.query(fb.collection(fb.db, "ocorrencias"), fb.where("status", "==", "ativo"), fb.where("identificador", "in", formas), fb.limit(3)));
        const ja = s.docs.find((x) => !(dados.minhasOcorrencias || []).includes(x.id) && x.data().autorId !== eu.uid);
        const minhaJa = s.docs.find((x) => (dados.minhasOcorrencias || []).includes(x.id) || x.data().autorId === eu.uid);
        if (minhaJa) { ok.disabled = false; toast("Você já tem uma ocorrência ativa com esse número."); abrirOcorrencia(minhaJa.id); return; }
        if (ja && !(await confirmarHF({ titulo: "Já existe um alerta com esse número", texto: `Alguém registrou ${TIPOS_OCORRENCIA[ja.data().tipo]?.toLowerCase() || "uma ocorrência"} com esse número em ${new Date(ms(ja.data().quando)).toLocaleDateString("pt-BR")}. Se é o mesmo caso, mande uma pista em vez de registrar de novo.`, ok: "Registrar mesmo assim", cancelar: "Voltar", icone: "alerta", cor: "normal" }))) { ok.disabled = false; return; }
      } catch {}
    }
    const g = await lerGps(8000) || pos;
    if (!g) { ok.disabled = false; toast("Ative a localização para marcar a região."); return; }
    const ref = fb.doc(fb.collection(fb.db, "ocorrencias"));
    const doc = {
      anonimo: st.anonimo, autorId: st.anonimo ? "" : eu.uid, ...(st.anonimo ? {} : { autorNome: String(dados.nome || "").slice(0, 80) }),
      tipo: st.tipo, objeto: st.objeto, identificador: ident, descricao: d.slice(0, 500),
      quando: fb.Timestamp.fromMillis(Math.min(Date.now() - 1000, new Date(`${dia.value}T${horaI.value || "12:00"}`).getTime() || Date.now() - 1000)),
      lat: Math.round(g.lat * 1e3) / 1e3, lng: Math.round(g.lng * 1e3) / 1e3, geo4: geohash(g.lat, g.lng, 4),
      bairro: bairro.value.trim().slice(0, 60), cidade: String(dados.cidade || "").slice(0, 60), uf: /^[A-Z]{2}$/.test(dados.uf || "") ? dados.uf : "",
      status: "ativo", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
    };
    const vei = veiAtual?.ler();
    if (vei && (vei.marca || vei.modelo || vei.ano || vei.cor)) doc.veiculo = vei;
    const gravar = async (x) => { const lote = fb.writeBatch(fb.db); lote.set(ref, x); if (st.anonimo) lote.set(fb.doc(fb.db, "ocorrencias_autoria", ref.id), { uid: eu.uid }); await lote.commit(); };
    try {
      // Regras de antes da atualização não aceitam "veiculo": grava sem ele (a placa vai do mesmo jeito).
      try { await gravar(doc); } catch (e) { if (e?.code !== "permission-denied" || !doc.veiculo) throw e; const sem = { ...doc }; delete sem.veiculo; await gravar(sem); }
      fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { minhasOcorrencias: fb.arrayUnion(ref.id) }, { merge: true }).catch(() => {});
      dados.minhasOcorrencias = [...(dados.minhasOcorrencias || []), ref.id];
      if (st.veiculoDoc) await marcarVeiculo(st.veiculoDoc, { status: "roubado", ocorrenciaId: ref.id, roubadoEm: fb.serverTimestamp() }).catch(() => {});
      fechar(); toast("Ocorrência registrada");
      dicas(st.objeto, ehVeiculo(st.objeto) ? { tipo: st.objeto, placa: ident, ...(vei || {}), uf: doc.uf, cidade: doc.cidade, quando: doc.quando } : null);
      if (aba === "roubos" || aba === "veiculos") pintarAba();
    } catch (e) { ok.disabled = false; toast(e?.code === "permission-denied" ? "Esta função ainda está sendo liberada." : "Não foi possível: " + erroAmigavel(e)); }
  });
  ok.id = "alOcOk";
  c.appendChild(ok);
}
function dicas(objeto, veiculo = null) {
  const { corpo: c } = abrirTela("O que fazer agora");
  if (veiculo) {
    c.appendChild(h("h3", null, "Procurando o seu veículo no Help Floripa"));
    const r = h("div", "al-busca-vei"); r.appendChild(vazio("Procurando anúncios com essa placa e parecidos..."));
    c.appendChild(r);
    procurarAnuncios(veiculo).then((res) => r.replaceChildren(blocoAnuncios(res, veiculo)));
  }
  c.appendChild(h("h3", null, "Próximos passos"));
  const ul = h("ul", "eg-lista-ben");
  (DICAS_OCORRENCIA[objeto] || DICAS_OCORRENCIA.outro).forEach((t) => { const li = h("li"); li.append(ic("check"), h("span", null, t)); ul.appendChild(li); });
  c.append(ul, h("p", "ent-sub", "Se alguém tiver uma pista, ela chega para você (sem mostrar quem mandou, se a pessoa quiser). Quando recuperar, marque como recuperado."));
}
async function abrirOcorrencia(id) {
  const { corpo: c } = abrirTela("Ocorrência");
  try {
    const d = await fb.getDoc(fb.doc(fb.db, "ocorrencias", id));
    if (!d.exists()) { c.appendChild(vazio("Ocorrência não encontrada.")); return; }
    const o = { id, ...d.data() };
    const minha = o.autorId === eu.uid || (dados.minhasOcorrencias || []).includes(id);
    c.appendChild(linhaOcorrencia(o, minha));
    if (o.identificador) c.appendChild(h("p", "ent-sub", `${OBJETOS[o.objeto]?.[1] || "Identificação"}: ${ehVeiculo(o.objeto) ? formatarPlaca(o.identificador) : o.identificador}`));
    if (o.veiculo) c.appendChild(h("p", "ent-sub", [o.veiculo.marca, o.veiculo.modelo, o.veiculo.ano, o.veiculo.cor].filter(Boolean).join(" · ")));
    if (minha) {
      if (o.status === "ativo") c.appendChild(botao("Recuperei", "ent-btn ok", async () => {
        try {
          await fb.updateDoc(fb.doc(fb.db, "ocorrencias", id), { status: "recuperado", atualizadoEm: fb.serverTimestamp() });
          const v = (await lerMeusVeiculos().catch(() => [])).find((x) => x.ocorrenciaId === id);
          if (v) await marcarVeiculo(v, { status: "recuperado" }).catch(() => {});
          toast("Que bom!");
        } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
      }));
      if (ehVeiculo(o.objeto) && o.identificador && o.status === "ativo") {
        c.appendChild(h("h3", null, "Anúncios no Help Floripa"));
        const r = h("div"); r.appendChild(vazio("Procurando..."));
        c.appendChild(r);
        procurarAnuncios({ tipo: o.objeto, placa: o.identificador, ...(o.veiculo || {}), uf: o.uf, cidade: o.cidade, quando: o.quando }).then((res) => r.replaceChildren(blocoAnuncios(res, o)));
      }
      c.appendChild(h("h3", null, "Pistas recebidas"));
      const lp = h("div", "ent-lista"); c.appendChild(lp);
      try {
        const s = await fb.getDocs(fb.query(fb.collection(fb.db, "ocorrencias", id, "pistas"), fb.limit(50)));
        const l = s.docs.map((x) => x.data()).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
        lp.replaceChildren(...(l.length ? l.map((p) => { const it = h("div", "ent-item"); it.append(h("b", null, p.anonimo ? (/^Alerta automático/.test(p.texto) ? "Alerta automático" : "Pista anônima") : p.nome || "Alguém"), h("small", null, dataCurta(p.criadoEm)), h("span", null, p.texto)); if (!p.anonimo && p.uid) it.appendChild(botao("Conversar", "ent-btn sec", () => conversar(p.uid))); return it; }) : [vazio("Nenhuma pista ainda.")]));
      } catch { lp.replaceChildren(vazio("Não foi possível ler as pistas.")); }
      return;
    }
    if (o.status === "ativo") c.appendChild(botao("Eu vi / tenho uma pista", "ent-btn", () => mandarPista(id)));
  } catch { c.appendChild(vazio("Indisponível agora.")); }
}
function mandarPista(id, textoPronto = "") {
  const { corpo: c, fechar } = abrirTela("Mandar uma pista");
  const t = h("textarea"); t.id = "alPista"; t.maxLength = 400; t.value = textoPronto; t.placeholder = "O que você viu, onde e quando";
  const l = h("label", "ent-campo"); l.append(h("span", null, "Pista"), t); c.appendChild(l);
  const la = h("label", "ent-check"); const ca = h("input"); ca.type = "checkbox"; ca.checked = true; ca.id = "alPistaAnonima";
  la.append(ca, h("span", null, "Mandar sem o meu nome (anônima)")); c.appendChild(la);
  c.appendChild(h("p", "ent-sub", "Não se arrisque. Em flagrante, ligue 190."));
  const ok = botao("Enviar pista", "ent-btn", async () => {
    if (t.value.trim().length < 3) { toast("Escreva a pista."); return; }
    ok.disabled = true;
    try { await gravarPista(id, t.value.trim(), ca.checked); toast("Pista enviada. Obrigado!"); fechar(); }
    catch (e) { ok.disabled = false; toast("Não foi possível: " + erroAmigavel(e)); }
  });
  ok.id = "alPistaOk";
  c.appendChild(ok);
}
async function gravarPista(id, texto, anonimo) {
  const ref = fb.doc(fb.collection(fb.db, "ocorrencias", id, "pistas"));
  const lote = fb.writeBatch(fb.db);
  lote.set(ref, anonimo ? { texto: texto.slice(0, 400), anonimo: true, criadoEm: fb.serverTimestamp() } : { texto: texto.slice(0, 400), anonimo: false, uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), criadoEm: fb.serverTimestamp() });
  if (anonimo) lote.set(fb.doc(fb.db, "pistas_autoria", `${id}_${ref.id}`), { uid: eu.uid });
  await lote.commit();
}
// Consulta antes de comprar usado: escolhe o que é, o campo se ajusta e confere o número (IMEI pela soma, placa nos
// dois padrões). Para carro/moto mostra também se está anunciado no Help Floripa.
const TIPOS_CONSULTA = { celular: ["Celular", "Pelo IMEI", "celular"], veiculo: ["Carro ou moto", "Pela placa", "carro"], bike: ["Bicicleta", "Número do quadro", "bicicleta"], outro: ["Outro", "Número de série", "notebook"] };
const chaveConsultas = () => `hf-consultas-${eu?.uid || ""}`;
function lerConsultas() { try { return JSON.parse(localStorage.getItem(chaveConsultas()) || "[]"); } catch { return []; } }
function guardarConsulta(tipo, numero, achou) { try { const l = lerConsultas().filter((x) => x.n !== numero); l.unshift({ t: tipo, n: numero, a: achou ? 1 : 0, em: Date.now() }); localStorage.setItem(chaveConsultas(), JSON.stringify(l.slice(0, 6))); } catch {} }
async function consultar(inicial, tipoIni = "") {
  const { corpo: c } = abrirTela("Consultar antes de comprar");
  c.appendChild(h("p", "ent-sub", "Vai comprar um usado? Confira se o número tem ocorrência de roubo, furto ou golpe registrada no Help Floripa."));
  let tipo = tipoIni || (inicial ? (placaOk(inicial) ? "veiculo" : /^\d{15}$/.test(String(inicial).replace(/\D/g, "")) ? "celular" : "outro") : "celular");
  c.appendChild(grupoOps(Object.entries(TIPOS_CONSULTA).map(([k, [n, d, i]]) => cartaoOp({ nome: n, desc: d, icone: i, ativo: tipo === k, dados: { consulta: k }, aoTocar: () => { tipo = k; pintarCampo(); res.replaceChildren(); } })), { colunas: 2, rotulo: "O que você vai comprar" }));
  const caixa = h("div"); c.appendChild(caixa);
  const res = h("div", "al-res");
  let campo = null;
  const pintarCampo = (val = "") => { campo = campoIdentificacao(tipo === "veiculo" ? "carro" : tipo === "outro" ? "notebook" : tipo, val); campo.input.id = "alConsulta"; caixa.replaceChildren(campo.el); };
  pintarCampo(inicial || "");
  const bt = botao("Consultar", "ent-btn", async () => {
    if (!campo.ok()) { toast(tipo === "celular" ? "Confira o IMEI (15 números)." : tipo === "veiculo" ? "Confira a placa." : "Confira o número."); return; }
    const x = campo.valor();
    if (x.length < 4) { toast("Digite o número completo."); return; }
    res.replaceChildren(vazio("Consultando..."));
    try {
      const formas = tipo === "veiculo" ? formasPlaca(x) : [x];
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "ocorrencias"), fb.where("status", "==", "ativo"), fb.where("identificador", "in", formas), fb.limit(5)));
      const partes = [];
      if (!s.docs.length) {
        const ok2 = h("div", "al-resultado verde"); ok2.append(iconeEl("check", { tam: 22, fundo: true }), h("div")); ok2.lastChild.append(h("b", null, "Nenhuma ocorrência com esse número"), h("small", null, tipo === "veiculo" ? `Placa ${formatarPlaca(x)}` : x));
        partes.push(ok2, h("p", "ent-sub", tipo === "celular" ? "Isso não garante a origem: peça a nota fiscal, confira o IMEI no aparelho (*#06#) e desconfie de preço muito baixo." : tipo === "veiculo" ? "Isso não garante a origem: confira o documento (CRLV) no app Carteira Digital de Trânsito, a placa e o chassi no próprio veículo, e faça a vistoria antes de pagar." : "Isso não garante a origem: peça a nota fiscal e desconfie de preço muito baixo."));
      } else {
        const o = { id: s.docs[0].id, ...s.docs[0].data() };
        const al = h("div", "al-resultado vermelho"); al.append(iconeEl("alerta", { tam: 22, fundo: true }), h("div")); al.lastChild.append(h("b", null, `Atenção: consta ${TIPOS_OCORRENCIA[o.tipo]?.toLowerCase() || "ocorrência"}`), h("small", null, `${new Date(ms(o.quando)).toLocaleDateString("pt-BR")}${o.bairro ? " · " + o.bairro : ""}${o.cidade ? ", " + o.cidade : ""}`));
        partes.push(al, h("p", "ent-sub", "Não compre. Se alguém está vendendo, mande uma pista (pode ser anônima) e, se for seguro, avise a polícia (190)."),
          botao("Mandar pista anônima", "ent-btn", () => mandarPista(o.id, `Este número foi oferecido à venda${dados.cidade ? " em " + dados.cidade : ""}.`)));
        // Quem registrou fica sabendo que alguém consultou (pista anônima automática, 1 vez por sessão).
        const k = `hf-consulta-${o.id}`;
        try { if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); gravarPista(o.id, `Alguém consultou este número no Help Floripa${dados.cidade ? " (" + dados.cidade + ")" : ""}: pode estar à venda.`, true).catch(() => {}); } } catch {}
      }
      if (tipo === "veiculo") {
        try {
          const v = await fb.getDocs(fb.query(fb.collection(fb.db, "veiculos_venda"), fb.where("placaHash", "==", await hashPlaca(x)), fb.limit(5)));
          v.docs.forEach((d) => { const a = d.data(); const l = h("a", "al-anuncio"); l.href = linkVenda(a); l.append(iconeEl(a.tipo === "moto" ? "moto" : "carro", { tam: 20, fundo: true }), h("span")); l.lastChild.append(h("b", null, "Anunciado no Help Floripa"), h("small", null, [a.item || nomeVeiculo(a), a.cidade].filter(Boolean).join(" · "))); partes.push(l); });
        } catch {}
      }
      res.replaceChildren(...partes);
      guardarConsulta(tipo, x, s.docs.length > 0);
      pintarRecentes();
    } catch (e) { res.replaceChildren(vazio("Não foi possível consultar: " + erroAmigavel(e))); }
  });
  bt.id = "alConsultar";
  c.append(bt, res);
  const rec = h("div", "al-recentes"); c.appendChild(rec);
  const pintarRecentes = () => {
    const l = lerConsultas();
    rec.replaceChildren();
    if (!l.length) return;
    rec.appendChild(h("h4", "op-sec", "Consultas recentes"));
    rec.appendChild(grupoOps(l.map((q) => cartaoOp({ nome: q.t === "veiculo" ? formatarPlaca(q.n) : q.n, desc: `${TIPOS_CONSULTA[q.t]?.[0] || "Número"} · ${q.a ? "tinha alerta" : "sem alerta"} · ${new Date(q.em).toLocaleDateString("pt-BR")}`, icone: q.a ? "alerta" : TIPOS_CONSULTA[q.t]?.[2] || "lupa", aoTocar: () => { tipo = q.t; pintarCampo(q.t === "veiculo" ? formatarPlaca(q.n) : q.n); bt.click(); } })), { colunas: 1, unico: false }));
  };
  pintarRecentes();
  if (inicial) bt.click();
}

// =====================================================
// VEÍCULOS (18/11/2026): o carro/moto da pessoa com a placa guardada só com ela. Roubado → ocorrência + busca de
// anúncios com a mesma placa (veiculos_venda, pelo hash) e parecidos (marca, modelo, cor, ano, lugar).
// Sem as regras novas publicadas, o cadastro fica na conta (usuarios.veiculosGuardados) e passa sozinho depois.
// =====================================================
let meusVeiculosCache = null;
async function lerMeusVeiculos(forcar = false) {
  if (meusVeiculosCache && !forcar) return meusVeiculosCache;
  const guardados = Object.entries(dados.veiculosGuardados || {}).map(([id, v]) => ({ id, ...v, _guardado: true }));
  let l = [];
  try {
    l = (await fb.getDocs(fb.query(fb.collection(fb.db, "veiculos"), fb.where("donoId", "==", eu.uid), fb.limit(20)))).docs.map((d) => ({ id: d.id, ...d.data() }));
    // As regras já aceitam: passa o que estava guardado na conta para a coleção.
    for (const g of guardados) {
      if (l.some((x) => x.id === g.id)) continue;
      try { const { _guardado, id, ...resto } = g; await fb.setDoc(fb.doc(fb.db, "veiculos", id), { ...resto, donoId: eu.uid, criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() }); l.push({ ...g, _guardado: false }); }
      catch { l.push(g); }
    }
    if (guardados.length && guardados.every((g) => l.some((x) => x.id === g.id && !x._guardado))) { fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { veiculosGuardados: fb.deleteField() }, { merge: true }).catch(() => {}); dados.veiculosGuardados = {}; }
  } catch { l = guardados; }
  meusVeiculosCache = l.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  return meusVeiculosCache;
}
async function marcarVeiculo(v, mudancas) {
  meusVeiculosCache = null;
  if (v._guardado) {
    const novo = { ...(dados.veiculosGuardados || {}) }; const { _guardado, id, ...resto } = v;
    Object.entries(mudancas).forEach(([k, x]) => { resto[k] = x && typeof x === "object" && !x.toMillis ? Date.now() : x; });
    novo[v.id] = resto; dados.veiculosGuardados = novo;
    return fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { veiculosGuardados: novo }, { merge: true });
  }
  return fb.updateDoc(fb.doc(fb.db, "veiculos", v.id), { ...mudancas, atualizadoEm: fb.serverTimestamp() });
}
async function procurarAnuncios(v) {
  const out = { iguais: [], parecidos: [], erro: false };
  try {
    const hash = v.placaHash || (v.placa ? await hashPlaca(v.placa) : "");
    const col = fb.collection(fb.db, "veiculos_venda");
    if (hash) out.iguais = (await fb.getDocs(fb.query(col, fb.where("placaHash", "==", hash), fb.limit(10)))).docs.map((d) => ({ id: d.id, ...d.data() }));
    const filtros = [fb.where("tipo", "==", v.tipo === "moto" ? "moto" : "carro")];
    if (/^[A-Z]{2}$/.test(v.uf || "")) filtros.push(fb.where("uf", "==", v.uf));
    const outros = (await fb.getDocs(fb.query(col, ...filtros, fb.limit(150)))).docs.map((d) => ({ id: d.id, ...d.data() }));
    out.parecidos = outros.filter((a) => a.placaHash !== hash && a.donoId !== eu.uid).map((a) => ({ ...a, _nota: semelhancaVeiculo({ ...v, placaHash: hash }, a) }))
      .filter((a) => a._nota >= PARECIDO_A_PARTIR).sort((a, b) => b._nota - a._nota).slice(0, 8);
  } catch { out.erro = true; }
  return out;
}
function blocoAnuncios(res, v) {
  const w = h("div", "al-anuncios");
  if (res.erro) { w.appendChild(h("p", "ent-sub", "A busca de anúncios começa a funcionar assim que a atualização do sistema terminar. A sua ocorrência já está valendo.")); return w; }
  if (res.iguais.length) {
    const al = h("div", "al-resultado vermelho"); al.append(iconeEl("alerta", { tam: 22, fundo: true }), h("div"));
    al.lastChild.append(h("b", null, `${res.iguais.length === 1 ? "Um anúncio" : res.iguais.length + " anúncios"} com a MESMA placa`), h("small", null, "Não vá sozinho ao encontro. Avise a polícia (190) e a equipe do Help Floripa."));
    w.appendChild(al);
    res.iguais.forEach((a) => {
      const l = h("a", "al-anuncio"); l.href = linkVenda(a); l.dataset.venda = a.id;
      l.append(iconeEl(a.tipo === "moto" ? "moto" : "carro", { tam: 20, fundo: true }), h("span"));
      l.lastChild.append(h("b", null, a.item || nomeVeiculo(a)), h("small", null, [a.cor, a.cidade, a.uf].filter(Boolean).join(" · ")));
      w.appendChild(l);
    });
    const placa = v?.placa || v?.identificador || "";
    w.appendChild(botao("Avisar a equipe de segurança", "ent-btn", () => irPara(`suporte.html?categoria=golpe&assunto=${encodeURIComponent("Veículo roubado anunciado no site")}&texto=${encodeURIComponent(`Meu veículo (${[v?.marca, v?.modelo].filter(Boolean).join(" ") || "carro/moto"}${placa ? ", placa " + formatarPlaca(placa) : ""}) foi roubado e aparece anunciado no Help Floripa: ${res.iguais.map((a) => new URL(linkVenda(a), location.href).href).join(" ")}`)}`)));
  } else {
    const ok = h("div", "al-resultado verde"); ok.append(iconeEl("escudo", { tam: 22, fundo: true }), h("div"));
    ok.lastChild.append(h("b", null, "Nenhum anúncio com essa placa"), h("small", null, "Se alguém tentar anunciar, a loja não consegue publicar e você recebe um alerta automático nas pistas."));
    w.appendChild(ok);
  }
  if (res.parecidos.length) {
    w.appendChild(h("h4", "op-sec", "Parecidos à venda (confira)"));
    res.parecidos.forEach((a) => {
      const l = h("a", "al-anuncio"); l.href = linkVenda(a);
      l.append(iconeEl(a.tipo === "moto" ? "moto" : "carro", { tam: 20, fundo: true }), h("span"), h("span", "ent-etq " + (a._nota >= 75 ? "amarelo" : "ciano"), textoSemelhancaVeiculo(a._nota)));
      l.children[1].append(h("b", null, a.item || nomeVeiculo(a)), h("small", null, [a.ano, a.cor, a.cidade].filter(Boolean).join(" · ")));
      w.appendChild(l);
    });
    w.appendChild(h("p", "ent-sub", "Parecido não quer dizer que é o seu: compare detalhes (adesivos, arranhões, rodas) pelas fotos antes de avisar."));
  }
  return w;
}
async function abaVeiculos() {
  corpo().appendChild(grupoOps([
    cartaoOp({ nome: "Cadastrar carro ou moto", desc: "A placa fica guardada só com você", icone: "carro", dados: { acao: "veiculo" }, aoTocar: () => editarVeiculo(null) }),
    cartaoOp({ nome: "Consultar uma placa", desc: "Antes de comprar um usado", icone: "lupa", dados: { acao: "consultarPlaca" }, aoTocar: () => consultar("", "veiculo") })
  ], { colunas: 1, unico: false, rotulo: "Ações" }));
  const sec = secao("Seus veículos");
  const lista = h("div", "ent-lista"); lista.id = "alVeiculos"; sec.appendChild(lista);
  lista.appendChild(vazio("Carregando..."));
  const mon = h("div"); mon.id = "alMonitor";
  const veis = await lerMeusVeiculos(true).catch(() => []);
  if (aba !== "veiculos") return;
  lista.replaceChildren(...(veis.length ? veis.map(linhaVeiculo) : [vazio("Nenhum veículo cadastrado. Cadastre o seu: se ele for roubado, um toque avisa a vizinhança e o Help Floripa procura anúncios com a mesma placa.")]));
  if (veis.some((v) => v._guardado)) lista.appendChild(h("p", "ent-sub", "Guardado na sua conta. Assim que a atualização do sistema terminar, ele passa a valer na busca automática."));
  // Monitoramento: cada veículo roubado é procurado de novo sempre que a aba abre.
  const roubados = veis.filter((v) => v.status === "roubado");
  if (roubados.length) {
    corpo().insertBefore(mon, corpo().firstChild?.nextSibling || null);
    for (const v of roubados) {
      const res = await procurarAnuncios(v);
      if (aba !== "veiculos") return;
      const caixa = h("section", "al-sec al-monitor"); caixa.appendChild(h("h3", null, `Monitorando: ${nomeVeiculo(v)}`));
      caixa.appendChild(blocoAnuncios(res, v)); mon.appendChild(caixa);
    }
  }
  const como = secao("Como funciona");
  const ul = h("ul", "eg-lista-ben");
  ["Cadastre a placa, a marca, o modelo, o ano e a cor. Ninguém vê a placa: só você e a equipe de segurança.",
    "Foi roubado? Toque em “Fui roubado ou furtado”: a ocorrência avisa a vizinhança e quem for comprar consegue consultar.",
    "Para vender carro ou moto no Shopping ou no Automotivo, a placa é obrigatória. Se ela tiver alerta, o anúncio não sai e você recebe um aviso.",
    "O Help Floripa também mostra anúncios parecidos (mesma marca, modelo, cor e ano por perto) para você conferir."].forEach((t) => { const li = h("li"); li.append(ic("check"), h("span", null, t)); ul.appendChild(li); });
  como.appendChild(ul);
}
function linhaVeiculo(v) {
  const b = h("button", "ent-item al-item"); b.type = "button"; b.dataset.veiculo = v.id;
  const lin = h("div", "lin");
  const tx = h("span", "pr-tx");
  tx.append(h("b", null, v.apelido || nomeVeiculo(v)), h("small", null, [formatarPlaca(v.placa), v.cor, v.apelido ? nomeVeiculo(v) : ""].filter(Boolean).join(" · ")));
  const st = STATUS_VEICULO[v.status] || STATUS_VEICULO.ok;
  lin.append(iconeEl(v.tipo === "moto" ? "moto" : "carro", { tam: 20, fundo: true }), tx, h("span", "ent-etq " + st[1], st[0]));
  b.appendChild(lin);
  b.addEventListener("click", () => abrirVeiculo(v));
  return b;
}
function abrirVeiculo(v) {
  const { corpo: c, fechar } = abrirTela(v.apelido || nomeVeiculo(v));
  const cart = h("div", "al-vei-cartao");
  const st = STATUS_VEICULO[v.status] || STATUS_VEICULO.ok;
  cart.append(iconeEl(v.tipo === "moto" ? "moto" : "carro", { tam: 30, fundo: true }), h("div"));
  cart.lastChild.append(h("b", null, nomeVeiculo(v)), h("span", "al-placa", formatarPlaca(v.placa)), h("small", null, [v.cor, TIPOS_VEICULO[v.tipo]?.[0]].filter(Boolean).join(" · ")), h("span", "ent-etq " + st[1], st[0]));
  c.appendChild(cart);
  const acoes = [];
  if (v.status === "roubado") {
    acoes.push(cartaoOp({ nome: "Procurar agora", desc: "Anúncios com a mesma placa e parecidos", icone: "lupa", aoTocar: () => { const r = h("div"); r.appendChild(vazio("Procurando...")); c.appendChild(r); procurarAnuncios(v).then((res) => r.replaceChildren(blocoAnuncios(res, v))); r.scrollIntoView({ behavior: "smooth" }); } }));
    if (v.ocorrenciaId) acoes.push(cartaoOp({ nome: "Ver a ocorrência e as pistas", desc: "O que a vizinhança mandou", icone: "olho", aoTocar: () => abrirOcorrencia(v.ocorrenciaId) }));
    acoes.push(cartaoOp({ nome: "Recuperei", desc: "Encerra o alerta e a ocorrência", icone: "check", aoTocar: async () => {
      try {
        if (v.ocorrenciaId) await fb.updateDoc(fb.doc(fb.db, "ocorrencias", v.ocorrenciaId), { status: "recuperado", atualizadoEm: fb.serverTimestamp() }).catch(() => {});
        await marcarVeiculo(v, { status: "recuperado" }); toast("Que bom! Alerta encerrado."); fechar(); pintarAba();
      } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
    } }));
  } else {
    acoes.push(cartaoOp({ nome: "Fui roubado ou furtado", desc: "Registra a ocorrência e procura anúncios com esta placa", icone: "sirene", classe: "perigo", dados: { acao: "roubado" }, aoTocar: () => { fechar(); registrarOcorrencia({ objeto: v.tipo, veiculo: v, tipo: "roubo" }); } }));
  }
  acoes.push(cartaoOp({ nome: "Editar", desc: "Placa, marca, modelo, ano e cor", icone: "documento", aoTocar: () => { fechar(); editarVeiculo(v); } }));
  acoes.push(cartaoOp({ nome: "Remover", desc: "Tira o veículo da sua lista", icone: "caixa", aoTocar: async () => {
    if (!(await confirmarHF({ titulo: "Remover este veículo?", texto: "Ele sai da sua lista. Ocorrências já registradas continuam valendo.", ok: "Remover", icone: "lixo" }))) return;
    try {
      meusVeiculosCache = null;
      if (v._guardado) { const novo = { ...(dados.veiculosGuardados || {}) }; delete novo[v.id]; dados.veiculosGuardados = novo; await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { veiculosGuardados: novo }, { merge: true }); }
      else await fb.deleteDoc(fb.doc(fb.db, "veiculos", v.id));
      toast("Veículo removido"); fechar(); pintarAba();
    } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
  } }));
  c.appendChild(grupoOps(acoes, { colunas: 1, unico: false }));
}
function editarVeiculo(v) {
  const { corpo: c, fechar, folha } = abrirTela(v ? "Editar veículo" : "Cadastrar veículo");
  let tipo = v?.tipo || "carro";
  passoNum(c, 1, "Tipo");
  c.appendChild(grupoOps(Object.entries(TIPOS_VEICULO).map(([k, [n]]) => cartaoOp({ nome: n, desc: k === "moto" ? "Motocicleta ou motoneta" : "Carro, picape ou utilitário", icone: k, ativo: tipo === k, dados: { tipoVeiculo: k }, aoTocar: () => { tipo = k; campos.tipo(k); folha.marcarMexido?.(); } })), { colunas: 2, rotulo: "Tipo" }));
  passoNum(c, 2, "Placa", "Fica guardada só com você e com a equipe de segurança. Ninguém mais vê.");
  const campoPlaca = campoIdentificacao("carro", v ? formatarPlaca(v.placa) : ""); campoPlaca.input.id = "alVeiPlaca";
  c.appendChild(campoPlaca.el);
  passoNum(c, 3, "Como ele é", "Ajuda a achar anúncios parecidos se a placa for trocada.");
  const campos = camposVeiculo(v || { tipo });
  c.appendChild(campos.el);
  const lap = h("label", "ent-campo"); const ap = h("input"); ap.id = "alVeiApelido"; ap.maxLength = 30; ap.placeholder = "Ex.: Carro do trabalho"; ap.value = v?.apelido || ""; lap.append(h("span", null, "Apelido (opcional)"), ap); c.appendChild(lap);
  const ok = botao(v ? "Salvar" : "Cadastrar veículo", "ent-btn", async () => {
    if (!placaOk(campoPlaca.input.value)) { toast("Confira a placa (ABC-1234 ou ABC1D23)."); campoPlaca.input.focus(); return; }
    const placa = placaMercosul(campoPlaca.input.value), x = campos.ler();
    if (!x.marca || !x.modelo) { toast("Informe a marca e o modelo."); return; }
    ok.disabled = true;
    // A placa tem alerta de outra pessoa? (pode ter comprado um veículo roubado sem saber)
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "ocorrencias"), fb.where("status", "==", "ativo"), fb.where("identificador", "in", formasPlaca(placa)), fb.limit(3)));
      const alheia = s.docs.find((d) => !(dados.minhasOcorrencias || []).includes(d.id) && d.data().autorId !== eu.uid);
      if (alheia) await confirmarHF({ titulo: "Esta placa tem alerta de roubo ou furto", texto: "Alguém registrou uma ocorrência ativa com esta placa. Se você comprou este veículo há pouco tempo, procure a polícia com o documento de compra. O cadastro continua.", ok: "Entendi", soOk: true, icone: "alerta", cor: "normal" });
    } catch {}
    const doc = { donoId: eu.uid, tipo, placa, placaHash: await hashPlaca(placa), ...x, apelido: ap.value.trim().slice(0, 30), chassiFim: "", status: v?.status || "ok", ocorrenciaId: v?.ocorrenciaId || "", atualizadoEm: fb.serverTimestamp() };
    try {
      meusVeiculosCache = null;
      if (v && !v._guardado) await fb.updateDoc(fb.doc(fb.db, "veiculos", v.id), doc);
      else {
        const ref = v ? fb.doc(fb.db, "veiculos", v.id) : fb.doc(fb.collection(fb.db, "veiculos"));
        try { await fb.setDoc(ref, { ...doc, criadoEm: fb.serverTimestamp() }); if (v?._guardado) { const novo = { ...(dados.veiculosGuardados || {}) }; delete novo[v.id]; dados.veiculosGuardados = novo; fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { veiculosGuardados: novo }, { merge: true }).catch(() => {}); } }
        catch (e) {
          if (e?.code !== "permission-denied") throw e;
          // Regras de antes: guarda na conta (só a pessoa lê) e passa para a coleção depois.
          const { atualizadoEm, ...semData } = doc;
          const novo = { ...(dados.veiculosGuardados || {}), [ref.id]: { ...semData, criadoEm: Date.now() } };
          await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { veiculosGuardados: novo }, { merge: true });
          dados.veiculosGuardados = novo;
        }
      }
      toast(v ? "Veículo salvo" : "Veículo cadastrado"); fechar(); aba = "veiculos"; pintarAba();
    } catch (e) { ok.disabled = false; toast("Não foi possível salvar: " + erroAmigavel(e)); }
  });
  ok.id = "alVeiSalvar";
  c.appendChild(ok);
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================
function abrirConfig() {
  const { corpo: c, fechar } = abrirTela("Configurações de alertas");
  const rede = botao("Rede de Help: quem recebe e como alertar", "ent-btn sec", () => abrirRede()); rede.id = "alAbrirRede";
  c.appendChild(rede);
  c.appendChild(h("h3", null, "Distância"));
  const rs = h("div", "ent-chips");
  RAIOS_ALERTA.forEach((r) => { const b = h("button", "ent-chip", `${r} km`); b.type = "button"; b.dataset.raio = String(r); b.setAttribute("aria-pressed", String(cfg.raio === r)); b.addEventListener("click", () => { cfg.raio = r; rs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }); rs.appendChild(b); });
  c.appendChild(rs);
  c.appendChild(h("h3", null, "O que mostrar perto de você"));
  const chave = (k, texto) => { const l = h("label", "ent-check"); const i = h("input"); i.type = "checkbox"; i.checked = cfg[k] !== false; i.dataset.cfg = k; i.addEventListener("change", () => (cfg[k] = i.checked)); l.append(i, h("span", null, texto)); c.appendChild(l); };
  chave("sosArea", "Pedidos de Help de quem está perto");
  chave("petsArea", "Pets perdidos e encontrados");
  chave("roubosArea", "Alertas de roubo, furto e golpe");
  c.appendChild(h("p", "ent-sub", "Pedidos de Help do seu Social chegam sempre (no Mensagens). Quando as notificações no celular estiverem ligadas, chegam também com o app fechado."));
  c.appendChild(botao("Salvar", "ent-btn", async () => {
    try { await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { alertas: { ...cfg } }, { merge: true }); dados.alertas = { ...cfg }; toast("Salvo"); fechar(); pintarAba(); }
    catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
  }));
}
