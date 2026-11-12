// =====================================================
// SOS e alertas (alertas.html)
// SOS: pede ajuda ao seu Social (cartão no Mensagens) e a quem está perto; quem aceita aparece para todos ("Fulano já
// está ajudando"), sem duas pessoas indo à toa. Pets: RG do pet, perdido, encontrado e cruzamento de semelhança com
// aviso automático. Roubos e furtos: ocorrência (anônima se quiser), pistas anônimas e consulta de IMEI/placa/série.
// Parâmetros: ?aba=sos|pets|roubos, ?sos=novo|ID, ?pet=ID, ?achado=ID, ?ocorrencia=ID, ?consultar=X, #config.
// =====================================================
import { $, toast, erroAmigavel, fb, eu, dados, iniciarRede, mandarMensagem, montarBarraRede } from "./rede.js?v=148";
import { confirmarHF } from "./confirmar.js?v=6";
import { minhaPosicao } from "./perto.js?v=3";
import {
  TIPOS_SOS, EMERGENCIAS, STATUS_SOS, sosVivo, TIPOS_OCORRENCIA, OBJETOS, normalizarId, identificadorOk, DICAS_OCORRENCIA,
  ESPECIES, CORES_PET, PORTES, STATUS_PET, rgPet, semelhanca, textoSemelhanca, AVISO_AUTOMATICO, MOSTRAR_A_PARTIR,
  distKm, geohash, vizinhos, RAIOS_ALERTA
} from "./alertas-base.js?v=1";
import { h, ic, botao, ms, dataCurta, avatar, lerGps, garantirConversa, irPara, abrirTela, avisarSom } from "./entregas-comum.js?v=4";
import { iconeEl, iconeSos, iconeEspecie } from "./icones-hf.js?v=1";

// SOS em etapas (12/11/2026): 1) o Social na hora; 2) se ninguém do Social aceitar em ESCALAR_MIN minutos (ou na hora,
// se a pessoa não tem Social), quem está perto E a equipe de segurança do Help Floripa (chamado URGENTE no suporte).
const ESCALAR_MIN = 3;

const params = new URLSearchParams(location.search);
let aba = ["sos", "pets", "roubos"].includes(params.get("aba")) ? params.get("aba") : "sos";
let pos = null, cfg = { raio: 10, sosArea: true, petsArea: true, roubosArea: true };
const paradas = [];
const corpo = () => $("alCorpo");
const km = (x) => (x == null ? "" : x < 1 ? `${Math.round(x * 1000)} m` : `${x.toFixed(x < 10 ? 1 : 0).replace(".", ",")} km`);

// Os telefones de emergência e o botão SOS respondem na hora (antes de a conta terminar de carregar).
let avisarPronto; const pronto = new Promise((r) => (avisarPronto = r));
pintarEmergencias($("alEmerg"));
$("alSos").addEventListener("click", async () => { const b = $("alSos"); b.classList.add("carregando"); await pronto; b.classList.remove("carregando"); pedirSos(); });
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
  if (sos === "novo") pedirSos(); else if (sos) abrirSos(sos);
  if (params.get("pet")) abrirRg(params.get("pet"));
  if (params.get("achado")) abrirAchado(params.get("achado"));
  if (params.get("ocorrencia")) abrirOcorrencia(params.get("ocorrencia"));
  if (params.get("consultar")) consultar(params.get("consultar"));
})();

function pintarEmergencias(alvo) {
  alvo.replaceChildren();
  EMERGENCIAS.forEach(([n, nome]) => { const a = h("a", "al-tel"); a.href = `tel:${n}`; a.append(h("b", null, n), h("small", null, nome)); alvo.appendChild(a); });
}
function pararTudo() { while (paradas.length) { try { paradas.pop()(); } catch {} } }
function pintarAba() {
  pararTudo();
  document.querySelectorAll("[data-aba]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.aba === aba)));
  corpo().replaceChildren();
  if (aba === "sos") abaSos(); else if (aba === "pets") abaPets(); else abaRoubos();
}
const perto = () => (pos ? vizinhos(pos.lat, pos.lng, 4) : null);
function vazio(t) { return h("p", "ent-vazio", t); }
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
    }, () => lista.replaceChildren(vazio("Esta função ainda está sendo liberada."))));
  };
  const col = fb.collection(fb.db, "sos");
  listar(meus, fb.query(col, fb.where("uid", "==", eu.uid), fb.limit(10)), (s) => sosVivo(s), "Nenhum pedido de ajuda aberto.");
  listar(doSocial, fb.query(col, fb.where("avisados", "array-contains", eu.uid), fb.limit(20)), (s) => sosVivo(s), "Ninguém do seu Social pediu ajuda.");
  if (cfg.sosArea && perto()) listar(area, fb.query(col, fb.where("publico", "==", true), fb.where("geo4", "in", perto()), fb.limit(50)),
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
  const { corpo: c, fechar } = abrirTela("Pedir ajuda (SOS)");
  const aviso = h("div", "al-urgente");
  aviso.append(h("b", null, "Em perigo ou emergência? Ligue agora:"));
  const tels = h("div", "al-tels"); pintarEmergencias(tels); aviso.appendChild(tels);
  aviso.appendChild(h("small", null, "O SOS avisa o seu Social e quem está perto, mas não chama a polícia, o SAMU nem os bombeiros."));
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
  let avisados = [], perto = "depois", equipe = true, escolheu = false, carregouSocial = false;
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
  const le = h("label", "ent-check al-check-eq"); const ce = h("input"); ce.type = "checkbox"; ce.checked = true; ce.id = "alSosEquipe";
  ce.addEventListener("change", () => { equipe = ce.checked; pintarEtapas(); });
  le.append(ce, h("span", null, "Avisar a equipe de segurança do Help Floripa como URGENTE"));
  et3.lastChild.append(h("b", null, "3. Equipe do Help Floripa"), h("small", null, ""), le);
  etapas.append(et1, et2, et3); c.appendChild(etapas);
  const pintarEtapas = () => {
    const temSocial = avisados.length > 0;
    if (!escolheu) perto = temSocial || !carregouSocial ? "depois" : "agora";
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
      avisados = [...new Set(s.docs.map((d) => (d.data().participantes || []).find((u) => u !== eu.uid)).filter(Boolean))].slice(0, 30);
    } catch { avisados = []; }
    carregouSocial = true; pintarEtapas();
  })();
  const enviar = botao("Escolha o que está acontecendo", "ent-btn al-btn-sos", async () => {
    enviar.disabled = true; enviar.textContent = "Pegando sua localização...";
    const p = await lerGps(10000);
    if (!p) { enviar.disabled = false; atualizar(); toast("Precisamos da sua localização para o SOS. Ative o GPS e permita no navegador."); return; }
    enviar.textContent = "Enviando...";
    try {
      const temSocial = avisados.length > 0;
      const publico = perto === "agora" || (perto === "depois" && !temSocial);
      const base = {
        uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), tipo, texto: area.value.trim().slice(0, 300),
        lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5, precisao: Math.round(p.precisao || 0), geo4: geohash(p.lat, p.lng, 4),
        publico, avisados, status: "aberto", ajudanteId: "", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
      };
      const extra = { equipe, escalarMin: perto === "depois" && temSocial ? ESCALAR_MIN : 0 };
      let ref;
      try { ref = await fb.addDoc(fb.collection(fb.db, "sos"), { ...base, ...extra }); }
      catch (e) { if (e?.code !== "permission-denied") throw e; ref = await fb.addDoc(fb.collection(fb.db, "sos"), { ...base, publico: perto !== "nao" }); extra.antigo = true; }
      // Social: cartão no Mensagens de cada pessoa (chega também como notificação com o app fechado quando o push estiver ligado).
      avisados.forEach((u) => mandarMensagem(u, { tipoArquivo: "cartao", cartao: { tipo: "sos", id: ref.id, sosTipo: tipo, nome: String(dados.nome || "").slice(0, 80) } }, `SOS: ${TIPOS_SOS[tipo][0]}`).catch(() => {}));
      // Equipe: na hora quando quem está perto já foi avisado (ou não vai ser); senão, junto com a escalada.
      if (equipe && (publico || perto === "nao" || extra.antigo)) chamadoSos({ id: ref.id, ...base, criadoEm: null }, temSocial ? "" : "Sem ninguém no Social: equipe avisada na hora.").catch(() => {});
      fechar(); toast("SOS enviado. Fique onde está se for seguro."); abrirSos(ref.id);
    } catch (e) { enviar.disabled = false; atualizar(); toast(e?.code === "permission-denied" ? "O SOS ainda está sendo liberado. Ligue 190/192/193 se for emergência." : "Não foi possível enviar: " + erroAmigavel(e)); }
  });
  enviar.id = "alSosEnviar";
  const atualizar = () => { enviar.disabled = !tipo; enviar.textContent = tipo ? "Enviar SOS agora" : "Escolha o que está acontecendo"; };
  atualizar();
  c.appendChild(enviar);
}
async function abrirSos(id) {
  const { corpo: c, fechar, folha } = abrirTela("SOS");
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
      // Atualiza a posição de quem pediu enquanto esta tela estiver aberta.
      if (vigia == null && navigator.geolocation) vigia = navigator.geolocation.watchPosition((p) => {
        if (Date.now() - ultimaPos < 20000) return; ultimaPos = Date.now();
        fb.updateDoc(fb.doc(fb.db, "sos", id), { lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5, precisao: Math.round(p.coords.accuracy || 0), geo4: geohash(p.coords.latitude, p.coords.longitude, 4), atualizadoEm: fb.serverTimestamp() }).catch(() => {});
      }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
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
    "PEDIDO DE AJUDA (SOS) · URGENTE",
    `O que está acontecendo: ${t}`,
    s.texto ? `Detalhes: “${s.texto}”` : "",
    `Onde: https://www.google.com/maps?q=${s.lat},${s.lng}${s.precisao ? ` (precisão de ${s.precisao} m)` : ""}`,
    `Social avisado: ${(s.avisados || []).length} ${(s.avisados || []).length === 1 ? "pessoa" : "pessoas"}.`,
    motivo,
    `Acompanhar ao vivo: https://helpfloripa.com.br/alertas.html?sos=${s.id}`
  ].filter(Boolean).join("\n");
  lote.set(ref, { prioridade: "urgente", uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), assunto: `SOS: ${t}`.slice(0, 120), categoria: "sos", status: "aberto", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
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
    mandarMensagem(s.uid, { tipoArquivo: "cartao", cartao: { tipo: "sos", id: s.id, sosTipo: s.tipo, nome: s.nome || "", acao: "ajudando" } }, "SOS: estou indo ajudar", { servico: { tipo: "sos", id: s.id } }).catch(() => {});
    toast("Obrigado! A pessoa e os outros veem que você está indo.");
  } catch (e) { toast(e?.message === "pego" ? "Outra pessoa já aceitou ajudar." : "Não foi possível: " + erroAmigavel(e)); }
}
async function conversar(uid, servico = null) {
  try { const id = await garantirConversa(fb, eu.uid, uid, servico); const m = await import("./chat-gaveta.js?v=4"); m.abrirChat(`mensagens.html?conversa=${encodeURIComponent(id)}`); }
  catch (e) { toast("Não foi possível abrir a conversa: " + erroAmigavel(e)); }
}

// =====================================================
// PETS
// =====================================================
function abaPets() {
  const topo = h("div", "al-acoes-topo");
  topo.append(botao("Cadastrar meu pet (RG)", "ent-btn", () => editarPet(null)), botao("Encontrei um animal", "ent-btn sec", () => achei()));
  corpo().appendChild(topo);
  const meus = secao("Seus pets");
  const lm = h("div", "ent-lista"); meus.appendChild(lm);
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "pets"), fb.where("donoId", "==", eu.uid), fb.limit(20)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    lm.replaceChildren(...(l.length ? l.map((p) => linhaPet(p, true)) : [vazio("Cadastre o seu pet: se ele sumir, quem encontrar acha você pelo RG e pelas características.")]));
  }, () => lm.replaceChildren(vazio("Esta função ainda está sendo liberada."))));
  if (!cfg.petsArea) return;
  const perdidos = secao("Perdidos perto de você", "Viu algum? Toque e avise o dono.");
  const encontrados = secao("Encontrados perto de você", "É o seu? Toque para ver e falar com quem encontrou.");
  if (!perto()) { perdidos.appendChild(vazio("Ative a localização para ver os pets perto.")); return; }
  const lp = h("div", "ent-lista"), le = h("div", "ent-lista");
  perdidos.appendChild(lp); encontrados.appendChild(le);
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "pets"), fb.where("visivel", "==", true), fb.where("status", "==", "perdido"), fb.where("geo4", "in", perto()), fb.limit(40)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.donoId !== eu.uid);
    lp.replaceChildren(...(l.length ? l.map((p) => linhaPet(p, false)) : [vazio("Nenhum pet perdido perto agora.")]));
  }, () => lp.replaceChildren(vazio("Indisponível agora."))));
  paradas.push(fb.onSnapshot(fb.query(fb.collection(fb.db, "pets_achados"), fb.where("status", "==", "ativo"), fb.where("geo4", "in", perto()), fb.limit(40)), (s) => {
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    le.replaceChildren(...(l.length ? l.map(linhaAchado) : [vazio("Nenhum animal encontrado perto agora.")]));
  }, () => le.replaceChildren(vazio("Indisponível agora."))));
}
function fotoOuEmoji(foto, especie) {
  const f = h("span", "al-foto");
  if (/^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/)/.test(String(foto || ""))) { const i = document.createElement("img"); i.src = foto; i.alt = ""; f.appendChild(i); }
  else { const [icn, cor] = iconeEspecie(especie); f.classList.add("sem-foto"); f.style.setProperty("--c", cor); f.appendChild(iconeEl(icn, { cor, tam: 26 })); }
  return f;
}
const descricaoPet = (p) => [ESPECIES[p.especie]?.[0], p.raca, (p.cores || []).join(" e "), PORTES[p.porte]].filter(Boolean).join(" · ");
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
// Campos comuns de pet (cadastro e animal encontrado).
function camposPet(c, v, { comNome = true } = {}) {
  const st = { especie: v.especie || "cao", cores: new Set(v.cores || []), porte: v.porte || "", sexo: v.sexo || "", foto: v.foto || "" };
  const campo = (rot, val, id, max) => { const l = h("label", "ent-campo"); const i = h("input"); i.value = val || ""; i.id = id; i.maxLength = max; l.append(h("span", null, rot), i); c.appendChild(l); return i; };
  const nome = comNome ? campo("Nome do pet", v.nome, "alPetNome", 40) : null;
  c.appendChild(h("h3", null, "Espécie"));
  const es = h("div", "ent-chips");
  for (const [k, [n, e]] of Object.entries(ESPECIES)) { const b = h("button", "ent-chip", `${e} ${n}`); b.type = "button"; b.dataset.especie = k; b.setAttribute("aria-pressed", String(st.especie === k)); b.addEventListener("click", () => { st.especie = k; es.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }); es.appendChild(b); }
  c.appendChild(es);
  c.appendChild(h("h3", null, "Cores (até 4)"));
  const cs = h("div", "ent-chips");
  CORES_PET.forEach((cor) => { const b = h("button", "ent-chip", cor); b.type = "button"; b.dataset.cor = cor; b.setAttribute("aria-pressed", String(st.cores.has(cor))); b.addEventListener("click", () => { if (st.cores.has(cor)) st.cores.delete(cor); else if (st.cores.size < 4) st.cores.add(cor); else toast("Até 4 cores."); b.setAttribute("aria-pressed", String(st.cores.has(cor))); }); cs.appendChild(b); });
  c.appendChild(cs);
  const linha = h("div", "ent-duplo");
  const sel = (rot, opcoes, val, aoMudar, id) => { const l = h("label", "ent-campo"); const s = h("select"); s.id = id; s.dataset.nativo = ""; opcoes.forEach(([k, n]) => s.appendChild(new Option(n, k, false, k === val))); s.addEventListener("change", () => aoMudar(s.value)); l.append(h("span", null, rot), s); linha.appendChild(l); };
  sel("Porte", [["", "Não sei"], ...Object.entries(PORTES)], st.porte, (x) => (st.porte = x), "alPetPorte");
  sel("Sexo", [["", "Não sei"], ["m", "Macho"], ["f", "Fêmea"]], st.sexo, (x) => (st.sexo = x), "alPetSexo");
  c.appendChild(linha);
  const raca = campo("Raça (ou SRD / vira-lata)", v.raca, "alPetRaca", 40);
  const sinais = campo("Sinais particulares (coleira, manchas, cicatriz...)", v.sinais, "alPetSinais", 300);
  const chip = campo("Microchip (se tiver)", v.microchip, "alPetChip", 24);
  c.appendChild(h("h3", null, "Foto"));
  const prev = h("div", "al-foto-prev"); const pintarPrev = () => prev.replaceChildren(fotoOuEmoji(st.foto, st.especie)); pintarPrev();
  const inp = h("input"); inp.type = "file"; inp.accept = "image/*"; inp.id = "alPetFoto";
  inp.addEventListener("change", async () => { const f = inp.files?.[0]; if (!f) return; try { st.foto = await reduzirFoto(f); pintarPrev(); } catch { toast("Não foi possível usar essa foto."); } });
  const lf = h("label", "ent-btn sec al-foto-bt"); lf.append(document.createTextNode("Escolher foto"), inp);
  c.append(prev, lf);
  return () => ({
    ...(comNome ? { nome: nome.value.trim().slice(0, 40) } : {}),
    especie: st.especie, cores: [...st.cores], porte: st.porte, sexo: st.sexo, raca: raca.value.trim().slice(0, 40),
    sinais: sinais.value.trim().slice(0, 300), microchip: normalizarId(chip.value).slice(0, 20), ...(st.foto ? { foto: st.foto } : {})
  });
}
function editarPet(p) {
  const { corpo: c, fechar } = abrirTela(p ? "Editar pet" : "Cadastrar pet");
  c.appendChild(h("p", "ent-sub", "Esse é o RG do seu pet no Help Floripa. Se ele sumir, quem encontrar um animal parecido é avisado de que pode ser o seu."));
  const ler = camposPet(c, p || {});
  const lv = h("label", "ent-check"); const cv = h("input"); cv.type = "checkbox"; cv.checked = p ? p.visivel !== false : true; cv.id = "alPetVisivel";
  lv.append(cv, h("span", null, "Aparecer nas buscas de animais encontrados (recomendado: é assim que acham você)")); c.appendChild(lv);
  const salvar = botao("Salvar RG do pet", "ent-btn", async () => {
    const v = ler();
    if (!v.nome) { toast("Diga o nome do pet."); return; }
    salvar.disabled = true;
    const doc = { ...v, donoId: eu.uid, donoNome: String(dados.nome || "").slice(0, 80), cidade: String(dados.cidade || "").slice(0, 60), uf: /^[A-Z]{2}$/.test(dados.uf || "") ? dados.uf : "",
      visivel: cv.checked, status: p?.status || "casa", geo4: p?.geo4 || (pos ? geohash(pos.lat, pos.lng, 4) : ""), atualizadoEm: fb.serverTimestamp() };
    if (p?.perdidoEm) { doc.perdidoEm = p.perdidoEm; doc.perdidoLocal = p.perdidoLocal; }
    try {
      if (p) await fb.setDoc(fb.doc(fb.db, "pets", p.id), { ...doc, criadoEm: p.criadoEm || fb.serverTimestamp() });
      else await fb.addDoc(fb.collection(fb.db, "pets"), { ...doc, criadoEm: fb.serverTimestamp() });
      toast("RG do pet salvo"); fechar();
    } catch (e) { salvar.disabled = false; toast(e?.code === "permission-denied" ? "O RG do pet ainda está sendo liberado." : "Não foi possível salvar: " + erroAmigavel(e)); }
  });
  salvar.id = "alPetSalvar";
  c.appendChild(salvar);
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
  lin("Nome", p.nome); lin("Espécie", ESPECIES[p.especie]?.[0]); lin("Raça", p.raca); lin("Cores", (p.cores || []).join(", ")); lin("Porte", PORTES[p.porte]); lin("Sexo", p.sexo === "m" ? "Macho" : p.sexo === "f" ? "Fêmea" : ""); lin("Microchip", p.microchip); lin("Sinais", p.sinais); lin("Tutor", (p.donoNome || "").split(" ")[0]);
  meio.append(fotoOuEmoji(p.foto, p.especie), dadosRg);
  const qr = h("div", "al-rg-qr");
  import("./qr.js?v=1").then(async (m) => { const svg = await m.qrSvg(`https://helpfloripa.com.br/alertas.html?pet=${p.id}`, "QR do RG do pet"); if (svg) { qr.innerHTML = ""; qr.appendChild(typeof svg === "string" ? Object.assign(document.createElement("div"), { innerHTML: svg }).firstChild : svg); } }).catch(() => {});
  card.append(cab, meio, qr, h("small", "al-rg-rod", "Achou este pet? Leia o QR ou procure o RG em Help Floripa › SOS e alertas › Pets."));
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
  const { corpo: c, fechar } = abrirTela("Encontrei um animal");
  c.appendChild(h("p", "ent-sub", "Conte como ele é: procuramos pets perdidos parecidos e com o mesmo microchip e avisamos os possíveis tutores."));
  const ler = camposPet(c, {}, { comNome: false });
  const onde = h("input"); onde.placeholder = "Rua, bairro ou ponto de referência"; onde.id = "alAchouOnde"; onde.maxLength = 120;
  const l = h("label", "ent-campo"); l.append(h("span", null, "Onde encontrou"), onde); c.appendChild(l);
  const ok = botao("Publicar e procurar o tutor", "ent-btn", async () => {
    ok.disabled = true;
    const g = await lerGps(8000) || pos;
    if (!g) { ok.disabled = false; toast("Ative a localização para marcar onde encontrou."); return; }
    const v = ler();
    const local = { lat: Math.round(g.lat * 1e4) / 1e4, lng: Math.round(g.lng * 1e4) / 1e4, nome: onde.value.trim().slice(0, 120) };
    try {
      const ref = await fb.addDoc(fb.collection(fb.db, "pets_achados"), { ...v, autorId: eu.uid, autorNome: String(dados.nome || "").slice(0, 80), local, geo4: geohash(g.lat, g.lng, 4), quando: fb.serverTimestamp(), status: "ativo", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() });
      fechar(); toast("Publicado! Procurando o tutor...");
      procurarTutores({ id: ref.id, ...v, local, geo4: geohash(g.lat, g.lng, 4), quando: Date.now() });
    } catch (e) { ok.disabled = false; toast(e?.code === "permission-denied" ? "Esta função ainda está sendo liberada." : "Não foi possível: " + erroAmigavel(e)); }
  });
  ok.id = "alAchouOk";
  c.appendChild(ok);
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
// ROUBOS E FURTOS
// =====================================================
function abaRoubos() {
  const topo = h("div", "al-acoes-topo");
  topo.append(botao("Registrar ocorrência", "ent-btn", registrarOcorrencia), botao("Consultar IMEI, placa ou série", "ent-btn sec", () => consultar("")));
  corpo().appendChild(topo);
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
    la.replaceChildren(...(l.length ? l.map((o) => linhaOcorrencia(o, false)) : [vazio("Nenhum alerta perto nos últimos 30 dias.")]));
  }, () => la.replaceChildren(vazio("Esta função ainda está sendo liberada."))));
}
function linhaOcorrencia(o, minha) {
  const b = h("button", "ent-item al-item"); b.type = "button"; b.dataset.ocorrencia = o.id;
  const lin = h("div", "lin");
  const tx = h("span", "pr-tx");
  tx.append(h("b", null, `${TIPOS_OCORRENCIA[o.tipo] || "Ocorrência"}: ${OBJETOS[o.objeto]?.[0] || "objeto"}`), h("small", null, `${[o.bairro, o.cidade].filter(Boolean).join(", ") || "Perto"} · ${dataCurta(o.quando)}${pos ? " · " + km(distKm(pos, o)) : ""}${o.anonimo ? " · anônima" : ""}`));
  lin.append(tx, h("span", "ent-etq " + (o.status === "ativo" ? "vermelho" : "verde"), o.status === "ativo" ? (minha ? "Ativa" : "Alerta") : o.status === "recuperado" ? "Recuperado" : "Encerrada"));
  b.appendChild(lin);
  b.appendChild(h("small", "pr-msg", o.descricao));
  b.addEventListener("click", () => abrirOcorrencia(o.id));
  return b;
}
function registrarOcorrencia() {
  const { corpo: c, fechar } = abrirTela("Registrar ocorrência");
  const st = { tipo: "furto", objeto: "celular", anonimo: true, foto: "" };
  const chips = (titulo, mapa, chave) => {
    c.appendChild(h("h3", null, titulo));
    const g = h("div", "ent-chips");
    for (const [k, v] of Object.entries(mapa)) { const b = h("button", "ent-chip", Array.isArray(v) ? v[0] : v); b.type = "button"; b.dataset[chave] = k; b.setAttribute("aria-pressed", String(st[chave] === k)); b.addEventListener("click", () => { st[chave] = k; g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); if (chave === "objeto") rotuloId(); }); g.appendChild(b); }
    c.appendChild(g);
  };
  chips("O que aconteceu", TIPOS_OCORRENCIA, "tipo");
  chips("O que foi levado", OBJETOS, "objeto");
  const lId = h("label", "ent-campo"); const spanId = h("span"); const iId = h("input"); iId.id = "alOcId"; iId.maxLength = 40; lId.append(spanId, iId); c.appendChild(lId);
  const rotuloId = () => { const r = OBJETOS[st.objeto][1]; lId.hidden = !r; spanId.textContent = `${r} (ajuda a recuperar e a evitar a revenda)`; };
  rotuloId();
  const desc = h("textarea"); desc.id = "alOcDesc"; desc.maxLength = 500; desc.placeholder = "Como foi, marca/modelo, cor, características. Não coloque dados pessoais de ninguém.";
  const ld = h("label", "ent-campo"); ld.append(h("span", null, "Descrição"), desc); c.appendChild(ld);
  const quando = h("input"); quando.type = "datetime-local"; quando.id = "alOcQuando"; quando.dataset.nativo = "";
  const agora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); quando.value = agora.toISOString().slice(0, 16); quando.max = quando.value;
  const lq = h("label", "ent-campo"); lq.append(h("span", null, "Quando"), quando); c.appendChild(lq);
  const bairro = h("input"); bairro.id = "alOcBairro"; bairro.maxLength = 60; bairro.value = dados.bairro || "";
  const lb = h("label", "ent-campo"); lb.append(h("span", null, "Bairro"), bairro); c.appendChild(lb);
  c.appendChild(h("p", "ent-sub", "O ponto no mapa é aproximado (cerca de 100 m), a partir da sua localização."));
  const lan = h("label", "ent-check"); const can = h("input"); can.type = "checkbox"; can.checked = true; can.id = "alOcAnonimo";
  can.addEventListener("change", () => (st.anonimo = can.checked));
  lan.append(can, h("span", null, "Publicar sem o meu nome (anônima). Só a moderação sabe quem registrou.")); c.appendChild(lan);
  const ok = botao("Registrar e avisar a vizinhança", "ent-btn", async () => {
    const d = desc.value.trim();
    if (d.length < 10) { toast("Descreva com pelo menos 10 letras."); desc.focus(); return; }
    if (!identificadorOk(st.objeto, iId.value)) { toast(st.objeto === "celular" ? "O IMEI tem 15 números (*#06# no celular)." : "Confira a placa (ABC1D23 ou ABC1234)."); iId.focus(); return; }
    ok.disabled = true;
    const g = await lerGps(8000) || pos;
    if (!g) { ok.disabled = false; toast("Ative a localização para marcar a região."); return; }
    const ref = fb.doc(fb.collection(fb.db, "ocorrencias"));
    const doc = {
      anonimo: st.anonimo, autorId: st.anonimo ? "" : eu.uid, ...(st.anonimo ? {} : { autorNome: String(dados.nome || "").slice(0, 80) }),
      tipo: st.tipo, objeto: st.objeto, identificador: normalizarId(iId.value), descricao: d.slice(0, 500),
      quando: fb.Timestamp.fromMillis(Math.min(Date.now() - 1000, new Date(quando.value).getTime() || Date.now() - 1000)),
      lat: Math.round(g.lat * 1e3) / 1e3, lng: Math.round(g.lng * 1e3) / 1e3, geo4: geohash(g.lat, g.lng, 4),
      bairro: bairro.value.trim().slice(0, 60), cidade: String(dados.cidade || "").slice(0, 60), uf: /^[A-Z]{2}$/.test(dados.uf || "") ? dados.uf : "",
      status: "ativo", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
    };
    try {
      const lote = fb.writeBatch(fb.db);
      lote.set(ref, doc);
      if (st.anonimo) lote.set(fb.doc(fb.db, "ocorrencias_autoria", ref.id), { uid: eu.uid });
      await lote.commit();
      fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { minhasOcorrencias: fb.arrayUnion(ref.id) }, { merge: true }).catch(() => {});
      dados.minhasOcorrencias = [...(dados.minhasOcorrencias || []), ref.id];
      fechar(); toast("Ocorrência registrada"); dicas(st.objeto);
      if (aba === "roubos") pintarAba();
    } catch (e) { ok.disabled = false; toast(e?.code === "permission-denied" ? "Esta função ainda está sendo liberada." : "Não foi possível: " + erroAmigavel(e)); }
  });
  ok.id = "alOcOk";
  c.appendChild(ok);
}
function dicas(objeto) {
  const { corpo: c } = abrirTela("O que fazer agora");
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
    if (o.identificador) c.appendChild(h("p", "ent-sub", `${OBJETOS[o.objeto]?.[1] || "Identificação"}: ${o.identificador}`));
    if (minha) {
      if (o.status === "ativo") c.appendChild(botao("Recuperei", "ent-btn ok", async () => { try { await fb.updateDoc(fb.doc(fb.db, "ocorrencias", id), { status: "recuperado", atualizadoEm: fb.serverTimestamp() }); toast("Que bom!"); } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); } }));
      c.appendChild(h("h3", null, "Pistas recebidas"));
      const lp = h("div", "ent-lista"); c.appendChild(lp);
      try {
        const s = await fb.getDocs(fb.query(fb.collection(fb.db, "ocorrencias", id, "pistas"), fb.limit(50)));
        const l = s.docs.map((x) => x.data()).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
        lp.replaceChildren(...(l.length ? l.map((p) => { const it = h("div", "ent-item"); it.append(h("b", null, p.anonimo ? "Pista anônima" : p.nome || "Alguém"), h("small", null, dataCurta(p.criadoEm)), h("span", null, p.texto)); if (!p.anonimo && p.uid) it.appendChild(botao("Conversar", "ent-btn sec", () => conversar(p.uid))); return it; }) : [vazio("Nenhuma pista ainda.")]));
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
// Consulta antes de comprar usado: IMEI, placa ou número de série com ocorrência ativa.
async function consultar(inicial) {
  const { corpo: c } = abrirTela("Consultar antes de comprar");
  c.appendChild(h("p", "ent-sub", "Vai comprar um celular, bike, carro ou moto usado? Confira se o IMEI, a placa ou o número de série tem ocorrência registrada no Help Floripa."));
  const i = h("input"); i.id = "alConsulta"; i.placeholder = "IMEI, placa ou número de série"; i.value = inicial || ""; i.maxLength = 40;
  const l = h("label", "ent-campo"); l.append(h("span", null, "Número"), i); c.appendChild(l);
  const res = h("div");
  const bt = botao("Consultar", "ent-btn", async () => {
    const x = normalizarId(i.value);
    if (x.length < 4) { toast("Digite o número completo."); return; }
    res.replaceChildren(vazio("Consultando..."));
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "ocorrencias"), fb.where("status", "==", "ativo"), fb.where("identificador", "==", x), fb.limit(5)));
      if (!s.docs.length) { res.replaceChildren(h("div", "al-estado verde", "Nenhuma ocorrência com esse número."), h("p", "ent-sub", "Isso não garante a origem: peça nota fiscal, confira o IMEI no aparelho (*#06#) e na Anatel, e desconfie de preço muito baixo.")); return; }
      const o = { id: s.docs[0].id, ...s.docs[0].data() };
      res.replaceChildren(h("div", "al-estado vermelho", `Atenção: consta ${TIPOS_OCORRENCIA[o.tipo]?.toLowerCase() || "ocorrência"} em ${new Date(ms(o.quando)).toLocaleDateString("pt-BR")}${o.bairro ? " · " + o.bairro : ""}${o.cidade ? ", " + o.cidade : ""}.`),
        h("p", "ent-sub", "Não compre. Se alguém está vendendo, mande uma pista (pode ser anônima) e, se for seguro, avise a polícia (190)."),
        botao("Mandar pista anônima", "ent-btn", () => mandarPista(o.id, `Este número foi oferecido à venda${dados.cidade ? " em " + dados.cidade : ""}.`)));
      // Quem registrou fica sabendo que alguém consultou (pista anônima automática, 1 vez por aparelho).
      const k = `hf-consulta-${o.id}`;
      try { if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); gravarPista(o.id, `Alguém consultou este número no Help Floripa${dados.cidade ? " (" + dados.cidade + ")" : ""}: pode estar à venda.`, true).catch(() => {}); } } catch {}
    } catch (e) { res.replaceChildren(vazio("Não foi possível consultar: " + erroAmigavel(e))); }
  });
  bt.id = "alConsultar";
  c.append(bt, res);
  if (inicial) bt.click();
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================
function abrirConfig() {
  const { corpo: c, fechar } = abrirTela("Configurações de alertas");
  c.appendChild(h("h3", null, "Distância"));
  const rs = h("div", "ent-chips");
  RAIOS_ALERTA.forEach((r) => { const b = h("button", "ent-chip", `${r} km`); b.type = "button"; b.dataset.raio = String(r); b.setAttribute("aria-pressed", String(cfg.raio === r)); b.addEventListener("click", () => { cfg.raio = r; rs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }); rs.appendChild(b); });
  c.appendChild(rs);
  c.appendChild(h("h3", null, "O que mostrar perto de você"));
  const chave = (k, texto) => { const l = h("label", "ent-check"); const i = h("input"); i.type = "checkbox"; i.checked = cfg[k] !== false; i.dataset.cfg = k; i.addEventListener("change", () => (cfg[k] = i.checked)); l.append(i, h("span", null, texto)); c.appendChild(l); };
  chave("sosArea", "Pedidos de ajuda (SOS) de quem está perto");
  chave("petsArea", "Pets perdidos e encontrados");
  chave("roubosArea", "Alertas de roubo, furto e golpe");
  c.appendChild(h("p", "ent-sub", "Pedidos de SOS do seu Social chegam sempre (no Mensagens). Quando as notificações no celular estiverem ligadas, chegam também com o app fechado."));
  c.appendChild(botao("Salvar", "ent-btn", async () => {
    try { await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { alertas: { ...cfg } }, { merge: true }); dados.alertas = { ...cfg }; toast("Salvo"); fechar(); pintarAba(); }
    catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
  }));
}
