// =====================================================
// Painel → Segurança e alertas (18/11/2026, pedido do dono: "tudo conectado ao painel profissional, bem organizado e
// com sistema inteligente"). Junta Help (SOS), ocorrências de roubo/furto/golpe, veículos à venda e pets, e faz os
// CRUZAMENTOS sozinho, no aparelho da equipe (sem servidor):
//   1) Mesma placa: ocorrência ativa de carro/moto × índice veiculos_venda (hash da placa no padrão Mercosul).
//   2) Veículo parecido: marca, modelo, cor, ano e lugar (semelhancaVeiculo, ≥ 75).
//   3) Pet perdido × animal encontrado (semelhanca dos pets, ≥ AVISO_AUTOMATICO).
//   4) Ocorrência repetida: o mesmo número em duas ocorrências ativas.
// Ações: ver o anúncio, ficha do vendedor, esconder o negócio, avisar a vítima (pista da equipe), ver quem registrou
// (autoria) e tirar ocorrência falsa do ar.
// =====================================================
import { C, h, ms, data, dataHora, relativo, selo, toast, registrar, abrirFicha, pode, semPermissao, esconderItem, enviarAviso } from "./admin-base.js?v=31";
import { destaque, num } from "./graficos.js?v=7";
import { confirmarHF } from "./confirmar.js?v=6";
import { TIPOS_OCORRENCIA, OBJETOS, TIPOS_SOS, STATUS_SOS, sosVivo, semelhanca, textoSemelhanca, AVISO_AUTOMATICO, ESPECIES } from "./alertas-base.js?v=2";
import { hashPlaca, formatarPlaca, placaEscondida, semelhancaVeiculo, textoSemelhancaVeiculo, nomeVeiculo } from "./veiculos-base.js?v=1";

const PAGINA_VENDA = { lojinha: "shopping.html", automotivo: "automotivo.html" };
const linkVenda = (a) => `${PAGINA_VENDA[a.tipoNegocio] || "shopping.html"}?negocio=${encodeURIComponent(a.negocioId)}`;
const ehVeiculo = (o) => o === "carro" || o === "moto";
let aba = "cruzamentos", cache = null;

const btn = (t, cls, fn) => { const b = h("button", "ad-bt " + (cls || ""), t); b.type = "button"; b.addEventListener("click", async (e) => { e.stopPropagation(); b.disabled = true; try { await fn(b); } catch (err) { console.error(err); toast("Não foi possível: " + (err.code || err.message)); } finally { b.disabled = false; } }); return b; };
function chips(opcoes, atual, aoMudar) {
  const w = h("div", "ad-filtros");
  opcoes.forEach(([v, t]) => { const b = h("button", "ad-chip", t); b.type = "button"; b.dataset.aba = v; b.setAttribute("aria-pressed", String(v === atual)); b.addEventListener("click", () => { w.querySelectorAll(".ad-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); aoMudar(v); }); w.appendChild(b); });
  return w;
}

async function ler(fb) {
  const q = (col, ...f) => fb.getDocs(fb.query(fb.collection(fb.db, col), ...f)).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch((e) => { console.warn(col, e.code || e.message); return null; });
  const [oc, vendas, sos, perdidos, achados, desap] = await Promise.all([
    q("ocorrencias", fb.where("status", "==", "ativo"), fb.limit(400)),
    q("veiculos_venda", fb.limit(800)),
    q("sos", fb.where("status", "in", ["aberto", "atendido"]), fb.limit(150)),
    q("pets", fb.where("status", "==", "perdido"), fb.limit(300)),
    q("pets_achados", fb.where("status", "==", "ativo"), fb.limit(300)),
    q("desaparecidos", fb.where("status", "in", ["analise", "ativo"]), fb.limit(200))
  ]);
  return { oc: oc || [], vendas: vendas || [], sos: (sos || []).filter((s) => sosVivo(s)), perdidos: perdidos || [], achados: achados || [], desap: desap || [], semRegras: vendas === null };
}
// Cruzamentos (tudo no aparelho da equipe).
async function cruzar(d) {
  const out = [];
  const porHash = new Map();
  d.vendas.forEach((v) => { if (!porHash.has(v.placaHash)) porHash.set(v.placaHash, []); porHash.get(v.placaHash).push(v); });
  const veiculos = d.oc.filter((o) => ehVeiculo(o.objeto) && o.identificador);
  for (const o of veiculos) {
    const hash = await hashPlaca(o.identificador);
    (porHash.get(hash) || []).forEach((v) => out.push({ tipo: "placa", nivel: 100, oc: o, venda: v }));
    const ref = { ...(o.veiculo || {}), tipo: o.objeto, uf: o.uf, cidade: o.cidade, quando: o.quando, placaHash: hash };
    if (o.veiculo?.marca) d.vendas.filter((v) => v.placaHash !== hash && v.tipo === o.objeto).forEach((v) => { const n = semelhancaVeiculo(ref, v); if (n >= 75) out.push({ tipo: "parecido", nivel: n, oc: o, venda: v }); });
  }
  for (const p of d.perdidos) for (const a of d.achados) { const n = semelhanca(p, a); if (n >= AVISO_AUTOMATICO) out.push({ tipo: "pet", nivel: n, pet: p, achado: a }); }
  const porId = new Map();
  d.oc.filter((o) => o.identificador).forEach((o) => { const k = `${o.objeto}:${ehVeiculo(o.objeto) ? o.identificador.replace(/^([A-Z]{3}\d)(\d)/, (m, a, b) => a + "ABCDEFGHIJ"[b]) : o.identificador}`; if (!porId.has(k)) porId.set(k, []); porId.get(k).push(o); });
  porId.forEach((l) => { if (l.length > 1) out.push({ tipo: "repetida", nivel: 50, lista: l }); });
  return out.sort((a, b) => b.nivel - a.nivel);
}

export function seguranca(el) {
  const cab = h("div", "ad-cab"); const t = h("div");
  t.append(h("h1", null, "Segurança e alertas"), h("p", null, "Help, ocorrências, veículos à venda e pets, com os cruzamentos feitos sozinhos: mesma placa, veículo parecido, pet perdido × encontrado e ocorrência repetida."));
  cab.appendChild(t);
  const bt = btn("Atualizar", "mini", async () => { cache = null; await montar(); }); cab.appendChild(bt);
  el.appendChild(cab);
  if (!pode("moderar")) el.appendChild(h("div", "ad-aviso-papel", "Seu papel pode ver; quem age (esconder, tirar do ar, avisar) é a moderação."));
  const kp = h("div", "ad-kpis"), filtros = h("div"), lista = h("div", "ad-lista");
  el.append(kp, filtros, lista);
  lista.appendChild(h("div", "ad-vazio", "Lendo Help, ocorrências, veículos e pets..."));
  let d = null, cruz = [];
  async function montar() {
    d = cache?.d || await ler(C.fb); cruz = cache?.cruz || await cruzar(d); cache = { d, cruz };
    const placa = cruz.filter((x) => x.tipo === "placa").length;
    kp.replaceChildren(
      destaque({ rotulo: "Cruzamentos", valor: cruz.length, dica: `${placa} com a mesma placa`, alerta: placa > 0 }),
      destaque({ rotulo: "Help em aberto", valor: d.sos.length, dica: `${d.sos.filter((s) => s.status === "aberto").length} sem ninguém ajudando`, alerta: d.sos.some((s) => s.status === "aberto") }),
      destaque({ rotulo: "Ocorrências ativas", valor: d.oc.length, dica: `${d.oc.filter((o) => ms(o.quando) > Date.now() - 7 * 864e5).length} nos últimos 7 dias` }),
      destaque({ rotulo: "Veículos roubados", valor: d.oc.filter((o) => ehVeiculo(o.objeto)).length, dica: "carros e motos com alerta" }),
      destaque({ rotulo: "Veículos à venda", valor: d.vendas.length, dica: "com a placa registrada (oculta)" }),
      destaque({ rotulo: "Desaparecidos", valor: d.desap.length, dica: `${d.desap.filter((x) => x.status === "analise").length} esperando conferir o boletim`, alerta: d.desap.some((x) => x.status === "analise") }),
      destaque({ rotulo: "Pets perdidos", valor: d.perdidos.length, dica: `${d.achados.length} encontrados esperando o tutor` })
    );
    filtros.replaceChildren(chips([["cruzamentos", `Cruzamentos (${cruz.length})`], ["help", `Help (${d.sos.length})`], ["ocorrencias", `Ocorrências (${d.oc.length})`], ["vendas", `Veículos à venda (${d.vendas.length})`], ["desaparecidos", `Desaparecidos (${d.desap.length})`], ["pets", `Pets (${d.perdidos.length})`]], aba, (v) => { aba = v; pintar(); }));
    if (d.semRegras) filtros.appendChild(h("div", "ad-aviso-papel", "Veículos à venda aparecem depois que as regras novas forem publicadas (coleção veiculos_venda)."));
    pintar();
  }
  function pintar() {
    const itens = aba === "cruzamentos" ? cruz.map(itemCruz) : aba === "help" ? d.sos.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)).map(itemSos)
      : aba === "ocorrencias" ? d.oc.sort((a, b) => ms(b.quando) - ms(a.quando)).map((o) => itemOc(o)) : aba === "vendas" ? d.vendas.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)).map(itemVenda)
      : aba === "desaparecidos" ? d.desap.sort((a, b) => (a.status === "analise" ? 0 : 1) - (b.status === "analise" ? 0 : 1) || ms(b.criadoEm) - ms(a.criadoEm)).map(itemDesap)
      : d.perdidos.sort((a, b) => ms(b.perdidoEm) - ms(a.perdidoEm)).map(itemPet);
    lista.replaceChildren(...(itens.length ? itens : [h("div", "ad-vazio", { cruzamentos: "Nenhum cruzamento agora. O painel confere de novo sempre que você abre esta seção.", help: "Nenhum pedido de Help aberto.", ocorrencias: "Nenhuma ocorrência ativa.", vendas: "Nenhum carro ou moto à venda.", desaparecidos: "Nenhum aviso de desaparecimento.", pets: "Nenhum pet perdido." }[aba])]));
  }
  // ---------- itens ----------
  function linhaOc(o) {
    const v = o.veiculo ? ` · ${[o.veiculo.marca, o.veiculo.modelo, o.veiculo.ano, o.veiculo.cor].filter(Boolean).join(" ")}` : "";
    return h("div", "meta", `${TIPOS_OCORRENCIA[o.tipo] || "Ocorrência"}: ${OBJETOS[o.objeto]?.[0] || "objeto"}${v} · ${[o.bairro, o.cidade, o.uf].filter(Boolean).join(", ")} · ${data(o.quando)}${o.identificador ? ` · ${ehVeiculo(o.objeto) ? "placa " + placaEscondida(o.identificador) : "nº final " + o.identificador.slice(-4)}` : ""}`);
  }
  function linhaVenda(v) { return h("div", "meta", `À venda: ${v.item || nomeVeiculo(v)} · ${[v.cor, v.cidade, v.uf].filter(Boolean).join(" · ")} · anunciado ${relativo(v.criadoEm)}`); }
  async function autoria(o) {
    if (o.autorId) return o.autorId;
    try { const a = await C.fb.getDoc(C.fb.doc(C.fb.db, "ocorrencias_autoria", o.id)); return a.exists() ? a.data().uid : ""; } catch { return ""; }
  }
  function acoesVenda(c, v, o) {
    const ac = h("div", "ad-acoes");
    const ver = h("a", "ad-bt mini", "Ver o anúncio"); ver.href = linkVenda(v); ver.target = "_blank"; ac.appendChild(ver);
    ac.appendChild(btn("Ficha do vendedor", "mini", () => abrirFicha(v.donoId)));
    if (pode("moderar")) {
      ac.appendChild(btn("Esconder o negócio", "mini perigo", async () => {
        if (!(await confirmarHF({ titulo: "Esconder o negócio do vendedor?", texto: "O perfil sai das vitrines até a equipe mostrar de novo (Negócios e anúncios).", ok: "Esconder", icone: "escudo" }))) return;
        await esconderItem("negocios", v.negocioId);
        await registrar("esconder_negocio", v.donoId, `Veículo com alerta de roubo à venda (${v.item || nomeVeiculo(v)})`, `negocios:${v.negocioId}`);
        toast("Negócio escondido");
      }));
      if (o) ac.appendChild(btn("Avisar a vítima", "mini", async () => {
        await C.fb.setDoc(C.fb.doc(C.fb.collection(C.fb.db, "ocorrencias", o.id, "pistas")), { texto: `Equipe de segurança do Help Floripa: encontramos um anúncio que pode ser do seu veículo (${v.item || nomeVeiculo(v)}, ${[v.cidade, v.uf].filter(Boolean).join("/")}). Não vá sozinho ao encontro: fale com a polícia (190). Vamos entrar em contato pelo Suporte.`.slice(0, 400), anonimo: false, uid: C.eu.uid, nome: "Equipe Help Floripa", criadoEm: C.fb.serverTimestamp() });
        await registrar("avisar_vitima", "", `ocorrencia ${o.id} × venda ${v.id}`, `ocorrencias:${o.id}`);
        toast("Pista enviada para quem registrou");
      }));
    }
    c.appendChild(ac);
  }
  function itemCruz(x) {
    const c = h("article", "ad-item"); const top = h("div", "cab");
    if (x.tipo === "placa") { top.append(selo("Mesma placa", "critico"), h("b", null, "Veículo com alerta de roubo à venda")); c.append(top, linhaOc(x.oc), linhaVenda(x.venda)); acoesVenda(c, x.venda, x.oc); }
    else if (x.tipo === "parecido") { top.append(selo(textoSemelhancaVeiculo(x.nivel), "atencao"), h("b", null, `${x.nivel}% parecido com um veículo roubado`)); c.append(top, linhaOc(x.oc), linhaVenda(x.venda), h("div", "meta", "Placa diferente: confira as fotos (adesivos, rodas, arranhões) antes de agir.")); acoesVenda(c, x.venda, x.oc); }
    else if (x.tipo === "pet") {
      top.append(selo(textoSemelhanca(x.nivel), "atencao"), h("b", null, `Pet perdido × animal encontrado (${x.nivel}%)`));
      c.append(top, h("div", "meta", `Perdido: ${x.pet.nome || "pet"} · ${ESPECIES[x.pet.especie]?.[0] || ""} · ${(x.pet.cores || []).join(", ")} · ${x.pet.cidade || ""} · desde ${data(x.pet.perdidoEm)}`),
        h("div", "meta", `Encontrado: ${ESPECIES[x.achado.especie]?.[0] || ""} · ${(x.achado.cores || []).join(", ")} · ${x.achado.local?.nome || ""} · ${data(x.achado.quando || x.achado.criadoEm)}`));
      const ac = h("div", "ad-acoes");
      ac.append(btn("Ficha do tutor", "mini", () => abrirFicha(x.pet.donoId)), btn("Ficha de quem achou", "mini", () => abrirFicha(x.achado.autorId)));
      const a1 = h("a", "ad-bt mini", "Ver o pet"); a1.href = `alertas.html?pet=${encodeURIComponent(x.pet.id)}`; a1.target = "_blank";
      const a2 = h("a", "ad-bt mini", "Ver o encontrado"); a2.href = `alertas.html?achado=${encodeURIComponent(x.achado.id)}`; a2.target = "_blank";
      ac.append(a1, a2); c.appendChild(ac);
    } else {
      top.append(selo("Repetida", "neutro"), h("b", null, `${x.lista.length} ocorrências ativas com o mesmo número`));
      c.appendChild(top); x.lista.forEach((o) => c.appendChild(linhaOc(o)));
      c.appendChild(h("div", "meta", "Pode ser a mesma pessoa registrando duas vezes, duas vítimas do mesmo golpe ou uma ocorrência falsa. Veja quem registrou cada uma em Ocorrências."));
    }
    return c;
  }
  function itemSos(s) {
    const c = h("article", "ad-item"); const top = h("div", "cab");
    const st = STATUS_SOS[s.status] || ["", ""];
    top.append(selo(st[0], s.status === "aberto" ? "critico" : "atencao"), h("b", null, TIPOS_SOS[s.tipo]?.[0] || "Help"), h("span", "quando", relativo(s.criadoEm)));
    c.append(top, h("div", "meta", [s.nome, s.texto, s.ajudanteNome ? `Ajudando: ${s.ajudanteNome}` : "", s.publico ? "aberto para quem está perto" : "só o Social", s.suporteId ? "chamado urgente aberto" : ""].filter(Boolean).join(" · ")));
    const ac = h("div", "ad-acoes");
    ac.appendChild(btn("Ficha de quem pediu", "mini", () => abrirFicha(s.uid)));
    if (Number.isFinite(s.lat)) { const m = h("a", "ad-bt mini", "Ver no mapa"); m.href = `https://www.google.com/maps?q=${s.lat},${s.lng}`; m.target = "_blank"; m.rel = "noopener"; ac.appendChild(m); }
    if (s.suporteId) { const a = h("a", "ad-bt mini", "Abrir o chamado"); a.href = `admin.html#suporte`; ac.appendChild(a); }
    c.appendChild(ac); return c;
  }
  function itemOc(o) {
    const c = h("article", "ad-item"); const top = h("div", "cab");
    top.append(selo(TIPOS_OCORRENCIA[o.tipo] || "Ocorrência", o.tipo === "roubo" ? "critico" : "atencao"), h("b", null, OBJETOS[o.objeto]?.[0] || "Objeto"), o.anonimo ? selo("Anônima", "neutro") : "", h("span", "quando", dataHora(o.quando)));
    c.append(top, linhaOc(o), h("div", "trecho", o.descricao || ""));
    const ac = h("div", "ad-acoes");
    if (pode("moderar")) {
      ac.appendChild(btn("Quem registrou", "mini", async () => { const uid = await autoria(o); if (uid) abrirFicha(uid); else toast("Não foi possível ver a autoria."); }));
      ac.appendChild(btn("Tirar do ar", "mini perigo", async () => {
        if (!(await confirmarHF({ titulo: "Tirar a ocorrência do ar?", texto: "Use para ocorrência falsa, com dados pessoais ou repetida. Ela some dos alertas e da consulta.", ok: "Tirar do ar", icone: "lixo" }))) return;
        await C.fb.updateDoc(C.fb.doc(C.fb.db, "ocorrencias", o.id), { status: "removido", atualizadoEm: C.fb.serverTimestamp() });
        await registrar("remover_ocorrencia", o.autorId || "", `${o.tipo} ${o.objeto}: ${String(o.descricao || "").slice(0, 80)}`, `ocorrencias:${o.id}`);
        d.oc = d.oc.filter((x) => x !== o); cache = null; toast("Ocorrência tirada do ar"); pintar();
      }));
    } else ac.appendChild(btn("Quem registrou", "mini", () => semPermissao()));
    c.appendChild(ac); return c;
  }
  function itemVenda(v) {
    const c = h("article", "ad-item"); const top = h("div", "cab");
    const alerta = cruz.some((x) => x.tipo === "placa" && x.venda.id === v.id);
    top.append(selo(v.tipo === "moto" ? "Moto" : "Carro", "neutro"), alerta ? selo("Alerta de roubo", "critico") : selo("Sem alerta", "bom"), h("b", null, v.item || nomeVeiculo(v)), h("span", "quando", relativo(v.criadoEm)));
    c.append(top, h("div", "meta", `${nomeVeiculo(v)} · ${[v.cor, v.cidade, v.uf].filter(Boolean).join(" · ")} · ${v.tipoNegocio === "automotivo" ? "Automotivo" : "Shopping"}`));
    acoesVenda(c, v, null); return c;
  }
  function itemDesap(x) {
    const c = h("article", "ad-item"); const top = h("div", "cab");
    const COND = { crianca: "Criança/adolescente", idoso: "Idoso", demencia: "Alzheimer/confusão", deficiencia: "Deficiência/autismo", adulto: "Adulto", outro: "Outra situação" };
    const PAR = { pais: "pai ou mãe", filho: "filho(a)", conjuge: "cônjuge", irmao: "irmão(ã)", parente: "outro parente", responsavel: "responsável legal", amigo: "amigo/vizinho" };
    top.append(selo(x.status === "analise" ? "Conferir boletim" : "Publicado", x.status === "analise" ? "critico" : "atencao"), h("b", null, x.nome), h("span", "quando", relativo(x.criadoEm)));
    c.appendChild(top);
    if (/^(data:image|https:\/\/firebasestorage)/.test(String(x.foto || ""))) { const im = document.createElement("img"); im.src = x.foto; im.alt = "Foto"; im.className = "ad-pub-img"; im.style.maxWidth = "160px"; c.appendChild(im); }
    c.append(h("div", "meta", `${COND[x.condicao] || ""}${Number.isInteger(x.idade) ? " · " + x.idade + " anos" : ""} · visto ${dataHora(x.quando)}${x.visto ? " em " + x.visto : ""} · ${[x.cidade, x.uf].filter(Boolean).join("/")}`),
      h("div", "meta", `Boletim: ${x.bo || "no registro de ações (sai do aviso ao publicar)"} · registrado por ${x.autorNome || "?"} (${PAR[x.parentesco] || "?"})`), h("div", "trecho", x.descricao || ""));
    const ac = h("div", "ad-acoes");
    ac.appendChild(btn("Ficha de quem registrou", "mini", () => abrirFicha(x.autorId)));
    if (pode("moderar")) {
      if (x.status === "analise") ac.appendChild(btn("Boletim conferido: publicar", "mini", async () => {
        // O boletim sai do aviso público (as regras exigem); ele fica no registro de ações logo abaixo.
        await C.fb.updateDoc(C.fb.doc(C.fb.db, "desaparecidos", x.id), { status: "ativo", bo: C.fb.deleteField(), atualizadoEm: C.fb.serverTimestamp() });
        await enviarAviso(x.autorId, { titulo: "Aviso de desaparecimento publicado", texto: `O aviso de ${x.nome} foi publicado para quem está perto. Pistas chegam em Help e alertas › Perdidos › Pessoas.`, tipo: "info" }).catch(() => {});
        await registrar("publicar_desaparecido", x.autorId, `${x.nome} · BO ${x.bo}`, `desaparecidos:${x.id}`);
        x.status = "ativo"; cache = null; toast("Aviso publicado"); pintar();
      }));
      ac.appendChild(btn(x.status === "analise" ? "Recusar" : "Tirar do ar", "mini perigo", async () => {
        if (!(await confirmarHF({ titulo: x.status === "analise" ? "Recusar este aviso?" : "Tirar o aviso do ar?", texto: "Use quando o boletim não confere, a pessoa já foi encontrada ou há sinal de abuso (alguém tentando achar quem fugiu).", ok: x.status === "analise" ? "Recusar" : "Tirar do ar", icone: "escudo" }))) return;
        await C.fb.updateDoc(C.fb.doc(C.fb.db, "desaparecidos", x.id), { status: "removido", atualizadoEm: C.fb.serverTimestamp() });
        await enviarAviso(x.autorId, { titulo: "Aviso de desaparecimento não publicado", texto: "A equipe não conseguiu confirmar o aviso. Fale com a polícia (190) e, se precisar, com o Suporte.", tipo: "alerta" }).catch(() => {});
        await registrar("remover_desaparecido", x.autorId, `${x.nome} · BO ${x.bo}`, `desaparecidos:${x.id}`);
        d.desap = d.desap.filter((y) => y !== x); cache = null; toast("Feito"); pintar();
      }));
      ac.appendChild(btn("Ver pistas", "mini", async (b) => {
        const s = await C.fb.getDocs(C.fb.query(C.fb.collection(C.fb.db, "desaparecidos", x.id, "pistas"), C.fb.limit(50)));
        const l = s.docs.map((y) => y.data()).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
        b.replaceWith(h("div", "trecho", l.length ? l.map((p) => `• ${dataHora(p.criadoEm)}: ${p.texto}${Number.isFinite(p.lat) ? ` (${p.lat}, ${p.lng})` : ""}`).join("\n") : "Nenhuma pista ainda."));
      }));
    }
    c.appendChild(ac); return c;
  }
  function itemPet(p) {
    const c = h("article", "ad-item"); const top = h("div", "cab");
    const par = cruz.filter((x) => x.tipo === "pet" && x.pet.id === p.id).length;
    top.append(selo("Perdido", "critico"), h("b", null, p.nome || "Pet"), par ? selo(`${par} parecido(s) encontrado(s)`, "atencao") : "", h("span", "quando", relativo(p.perdidoEm)));
    c.append(top, h("div", "meta", [ESPECIES[p.especie]?.[0], p.raca, (p.cores || []).join(", "), p.cidade].filter(Boolean).join(" · ")));
    const ac = h("div", "ad-acoes"); ac.appendChild(btn("Ficha do tutor", "mini", () => abrirFicha(p.donoId)));
    const a = h("a", "ad-bt mini", "Ver o RG"); a.href = `alertas.html?pet=${encodeURIComponent(p.id)}`; a.target = "_blank"; ac.appendChild(a);
    c.appendChild(ac); return c;
  }
  montar().catch((e) => lista.replaceChildren(h("div", "ad-vazio", "Não foi possível ler: " + (e.code || e.message))));
}
