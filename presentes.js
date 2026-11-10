// =====================================================
// Presentes (presentes.html): enviar e receber presentes.
// Mimo virtual, dinheiro (Pix direto), lanche/produto de um negócio do Help Floripa, corrida ou entrega paga por quem dá.
// Quem recebe aceita ou recusa; quem pode mandar segue a escolha da pessoa (pref_publicas.presentes).
// Parâmetros: ?para=UID (enviar para alguém), ?id=PRESENTE (abrir), ?gorjeta=CORRIDA (gorjeta para quem levou),
// ?negocio=ID (enviar um produto desse negócio), ?aba=enviados.
// =====================================================
import { $, toast, erroAmigavel, fb, eu, dados, iniciarRede, mandarMensagem, montarBarraRede } from "./rede.js?v=140";
import { confirmarHF } from "./confirmar.js?v=6";
import { tipoChavePix } from "./pix.js?v=1";
import { TIPOS_PRESENTE, MIMOS, QUEM_PODE, STATUS_PRESENTE, reaisP, VALOR_MAX_PRESENTE, resumoPresente, emojiPresente, proximoPasso } from "./presentes-base.js?v=1";
import { h, ic, botao, ms, dataCurta, avatar, garantirConversa, irPara, abrirTela } from "./entregas-comum.js?v=2";

const params = new URLSearchParams(location.search);
let aba = params.get("aba") === "enviados" ? "enviados" : "recebidos";
let lista = { recebidos: [], enviados: [] };
let pararR = null, pararE = null;
const corpo = () => $("prCorpo");

(async () => {
  try { await iniciarRede(); }
  catch (e) { corpo().replaceChildren(h("p", "ent-vazio", e.message || "Entre na sua conta.")); return; }
  try { montarBarraRede(""); } catch {}
  $("prEnviar").addEventListener("click", () => abrirEnviar({}));
  $("prQuem").addEventListener("click", abrirQuemPode);
  document.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => { aba = b.dataset.aba; pintar(); }));
  ouvir();
  pintarQuemPode();
  if (params.get("gorjeta")) abrirGorjeta(params.get("gorjeta"));
  else if (params.get("para") || params.get("negocio")) abrirEnviar({ para: params.get("para") || "", negocio: params.get("negocio") || "" });
  if (params.get("id")) abrirPresente(params.get("id"));
})();

function ouvir() {
  const col = fb.collection(fb.db, "presentes");
  const tratar = (k) => (s) => { lista[k] = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)); pintar(); };
  const erro = () => { corpo().replaceChildren(h("p", "ent-vazio", "Os presentes ainda não estão liberados. Tente de novo mais tarde.")); };
  pararR = fb.onSnapshot(fb.query(col, fb.where("para", "==", eu.uid), fb.limit(80)), tratar("recebidos"), erro);
  pararE = fb.onSnapshot(fb.query(col, fb.where("de", "==", eu.uid), fb.limit(80)), tratar("enviados"), erro);
}

function pintar() {
  document.querySelectorAll("[data-aba]").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.aba === aba));
    const n = b.dataset.aba === "recebidos" ? lista.recebidos.filter((p) => p.status === "pendente").length : 0;
    b.querySelector("b").textContent = n ? String(n) : "";
  });
  const l = lista[aba];
  const c = corpo();
  c.replaceChildren();
  if (!l.length) {
    const v = h("div", "ent-vazio");
    v.append(h("div", "pr-vazio-ic", "🎁"), h("p", null, aba === "recebidos" ? "Você ainda não recebeu presentes." : "Você ainda não enviou presentes."));
    if (aba === "enviados") v.appendChild(botao("Enviar o primeiro", "ent-btn", () => abrirEnviar({})));
    c.appendChild(v);
    return;
  }
  const grade = h("div", "ent-lista");
  l.forEach((p) => grade.appendChild(linhaPresente(p)));
  c.appendChild(grade);
}
function linhaPresente(p) {
  const recebi = p.para === eu.uid;
  const b = h("button", "ent-item pr-item"); b.type = "button"; b.dataset.presente = p.id;
  const lin = h("div", "lin");
  const e = h("span", "pr-emoji", emojiPresente(p));
  const t = h("span", "pr-tx");
  t.append(h("b", null, resumoPresente(p)), h("small", null, `${recebi ? "De " + (p.deNome || "alguém") : "Para " + (p.paraNome || "alguém")} · ${dataCurta(p.criadoEm)}`));
  const st = STATUS_PRESENTE[p.status] || ["", ""];
  lin.append(e, t, h("span", "ent-etq " + st[1], st[0]));
  b.appendChild(lin);
  if (p.mensagem) b.appendChild(h("small", "pr-msg", `“${p.mensagem}”`));
  b.addEventListener("click", () => abrirPresente(p.id));
  return b;
}

// ---------- quem pode me mandar presentes ----------
async function lerQuemPode(uid) {
  try { const d = await fb.getDoc(fb.doc(fb.db, "pref_publicas", uid)); return d.exists() ? d.data().presentes || "seguindo" : "seguindo"; } catch { return "seguindo"; }
}
async function pintarQuemPode() {
  const q = await lerQuemPode(eu.uid);
  $("prQuemTx").textContent = QUEM_PODE[q]?.[0] || QUEM_PODE.seguindo[0];
}
async function abrirQuemPode() {
  const atual = await lerQuemPode(eu.uid);
  const { corpo: c, fechar } = abrirTela("Quem pode me enviar presentes");
  c.appendChild(h("p", "ent-sub", "Você sempre pode recusar um presente. Ninguém vê o seu endereço: ele vai só para a loja que entrega."));
  const ops = h("div", "ent-ops");
  for (const [k, [nome, desc]] of Object.entries(QUEM_PODE)) {
    const b = h("button", "ent-op"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(k === atual)); b.dataset.quem = k;
    const i = h("span", "ic", k === "todos" ? "🌎" : k === "seguindo" ? "👥" : k === "vinculos" ? "💞" : "🚫");
    const tx = h("span"); tx.append(h("b", null, nome), h("small", null, desc));
    b.append(i, tx, h("span"));
    b.addEventListener("click", async () => {
      try {
        await fb.setDoc(fb.doc(fb.db, "pref_publicas", eu.uid), { presentes: k, atualizadoEm: fb.serverTimestamp() }, { merge: true });
        toast("Salvo"); pintarQuemPode(); fechar();
      } catch (e) { toast(e?.code === "permission-denied" ? "Esta opção ainda está sendo liberada." : "Não foi possível salvar: " + erroAmigavel(e)); }
    });
    ops.appendChild(b);
  }
  c.appendChild(ops);
}
// A pessoa aceita presentes de mim? (a mesma conta das regras; a regra confere de novo)
async function podeMandarPara(uid) {
  const q = await lerQuemPode(uid);
  if (q === "todos") return { ok: true };
  if (q === "ninguem") return { ok: false, motivo: "não recebe presentes" };
  const ids = [eu.uid, uid].sort();
  const [v, r] = await Promise.all([
    fb.getDoc(fb.doc(fb.db, "vinculos", `${ids[0]}_${ids[1]}`)).catch(() => null),
    fb.getDoc(fb.doc(fb.db, "relacoes", `${uid}_${eu.uid}`)).catch(() => null)
  ]);
  const social = !!v?.exists() && v.data().status === "aceito";
  if (social) return { ok: true };
  if (q === "seguindo" && r?.exists()) return { ok: true };
  return { ok: false, motivo: q === "vinculos" ? "só recebe presentes de quem está no Social dela" : "só recebe presentes de quem ela segue" };
}

// ---------- enviar ----------
async function perfil(uid) {
  try { const p = await fb.getDoc(fb.doc(fb.db, "perfis_publicos", uid)); return p.exists() ? { uid, ...p.data() } : null; } catch { return null; }
}
async function abrirEnviar({ para = "", negocio = "", tipo = "", corridaId = "", valor = 0 }) {
  const { corpo: c, fechar } = abrirTela(corridaId ? "Dar uma gorjeta" : "Enviar um presente");
  const S = { para: null, tipo: tipo || (negocio ? "produto" : ""), mimo: "coracao", valor: valor || 0, negocio: null, qtd: {}, mensagem: "", corridaId };
  const passoPara = h("div"), passoTipo = h("div"), passoDetalhe = h("div"), passoMsg = h("div");
  const enviar = botao("Enviar presente", "ent-btn", () => mandar());
  enviar.id = "prMandar";
  c.append(passoPara, passoTipo, passoDetalhe, passoMsg, enviar);
  const atualizar = () => {
    let falta = !S.para ? "Escolha para quem" : !S.tipo ? "Escolha o presente" : "";
    if (!falta && ["pix", "corrida", "entrega"].includes(S.tipo) && !(S.valor >= 1)) falta = "Escolha o valor";
    if (!falta && S.tipo === "produto" && !Object.values(S.qtd).some((q) => q > 0)) falta = "Escolha os itens";
    enviar.disabled = !!falta;
    enviar.textContent = falta || (corridaId ? `Enviar gorjeta de ${reaisP(S.valor)}` : `Enviar para ${S.para.nome?.split(" ")[0] || "a pessoa"}`);
  };
  // 1) Para quem
  const pintarPara = async () => {
    passoPara.replaceChildren(h("h3", null, "Para quem"));
    if (S.para) {
      const b = h("div", "ent-quem");
      const av = h("span", "avatar"); avatar(av, S.para.fotoPerfil, S.para.nome);
      const tx = h("span"); tx.append(h("b", null, S.para.nome || "Pessoa"), h("small", null, S.para.nickname ? "@" + S.para.nickname : ""));
      b.append(av, tx);
      if (!corridaId) { const x = h("button", "x"); x.type = "button"; x.setAttribute("aria-label", "Trocar"); x.appendChild(ic("fechar")); x.addEventListener("click", () => { S.para = null; pintarPara(); atualizar(); }); b.appendChild(x); }
      passoPara.appendChild(b);
      if (S.bloqueio) passoPara.appendChild(h("div", "ent-nota alerta", S.bloqueio));
      return;
    }
    const campo = h("input"); campo.type = "search"; campo.placeholder = "@ da pessoa"; campo.id = "prBusca"; campo.autocomplete = "off";
    const l = h("label", "ent-campo"); l.append(h("span", null, "Procure pelo @ ou escolha abaixo"), campo);
    const res = h("div");
    passoPara.append(l, res);
    // Pessoas que eu sigo
    (async () => {
      try {
        const s = await fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("seguidorId", "==", eu.uid), fb.limit(24)));
        const ps = (await Promise.all(s.docs.map((d) => perfil(d.data().alvoId)))).filter(Boolean);
        if (!ps.length || S.para) return;
        const t = h("div", "pr-pessoas");
        ps.forEach((p) => { const b = h("button", "pr-pessoa"); b.type = "button"; const av = h("span", "avatar"); avatar(av, p.fotoPerfil, p.nome); b.append(av, h("small", null, (p.nome || "").split(" ")[0])); b.addEventListener("click", () => escolherPara(p)); t.appendChild(b); });
        res.appendChild(t);
      } catch {}
    })();
    let tm = 0;
    campo.addEventListener("input", () => {
      clearTimeout(tm);
      const nick = campo.value.trim().replace(/^@/, "").toLowerCase();
      if (nick.length < 3) return;
      tm = setTimeout(async () => {
        try {
          const n = await fb.getDoc(fb.doc(fb.db, "nicknames", nick));
          const uid = n.exists() ? n.data().uid : "";
          const p = uid && uid !== eu.uid ? await perfil(uid) : null;
          res.querySelector(".pr-achado")?.remove();
          const linha = h("div", "pr-achado");
          if (!p) linha.appendChild(h("p", "ent-vazio", uid === eu.uid ? "Esse é você." : `Ninguém com o @${nick}.`));
          else { const b = h("button", "ent-res"); b.type = "button"; b.dataset.achado = uid; const i = h("span", "ic"); avatar(i, p.fotoPerfil, p.nome); const tx = h("span"); tx.append(h("b", null, p.nome), h("small", null, "@" + nick)); b.append(i, tx); b.addEventListener("click", () => escolherPara(p)); linha.appendChild(b); }
          res.prepend(linha);
        } catch {}
      }, 400);
    });
  };
  const escolherPara = async (p) => {
    S.para = p; S.bloqueio = "";
    if (!corridaId) { const r = await podeMandarPara(p.uid); if (!r.ok) S.bloqueio = `${(p.nome || "A pessoa").split(" ")[0]} ${r.motivo}. Você pode mandar uma mensagem em vez disso.`; }
    pintarPara(); atualizar();
    if (S.bloqueio) enviar.disabled = true;
  };
  // 2) Tipo
  const pintarTipo = () => {
    if (corridaId) { passoTipo.replaceChildren(); return; }
    passoTipo.replaceChildren(h("h3", null, "O presente"));
    const ops = h("div", "ent-ops");
    for (const [k, t] of Object.entries(TIPOS_PRESENTE)) {
      const b = h("button", "ent-op"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(S.tipo === k)); b.dataset.tipo = k;
      const i = h("span", "ic", emojiPresente({ tipo: k, mimo: "coracao" })); i.style.fontSize = "24px";
      const tx = h("span"); tx.append(h("b", null, t.nome), h("small", null, t.desc));
      b.append(i, tx, h("span"));
      b.addEventListener("click", () => { S.tipo = k; if (k !== "produto") S.negocio = null; pintarTipo(); pintarDetalhe(); atualizar(); });
      ops.appendChild(b);
    }
    passoTipo.appendChild(ops);
  };
  // 3) Detalhe
  const chipsValor = (valores) => {
    const box = h("div");
    const chips = h("div", "ent-chips");
    const campo = h("input"); campo.inputMode = "decimal"; campo.placeholder = "Outro valor"; campo.id = "prValor"; campo.className = "pr-valor";
    valores.forEach((v) => { const b = h("button", "ent-chip", reaisP(v)); b.type = "button"; b.setAttribute("aria-pressed", String(S.valor === v)); b.addEventListener("click", () => { S.valor = v; campo.value = ""; chips.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); atualizar(); }); chips.appendChild(b); });
    campo.addEventListener("input", () => { const v = Number(campo.value.replace(/[^\d,]/g, "").replace(",", ".")); S.valor = Number.isFinite(v) ? Math.min(VALOR_MAX_PRESENTE, Math.round(v * 100) / 100) : 0; chips.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false")); atualizar(); });
    chips.appendChild(campo);
    box.appendChild(chips);
    return box;
  };
  const pintarDetalhe = async () => {
    passoDetalhe.replaceChildren();
    if (!S.tipo) return;
    if (S.tipo === "mimo") {
      passoDetalhe.appendChild(h("h3", null, "Escolha o mimo"));
      const g = h("div", "pr-mimos");
      for (const [k, [e, nome]] of Object.entries(MIMOS)) {
        const b = h("button", "pr-mimo"); b.type = "button"; b.dataset.mimo = k; b.setAttribute("aria-pressed", String(S.mimo === k)); b.setAttribute("aria-label", nome);
        b.append(h("span", null, e), h("small", null, nome.replace(/^Uma? /, "")));
        b.addEventListener("click", () => { S.mimo = k; g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });
        g.appendChild(b);
      }
      passoDetalhe.appendChild(g);
    } else if (S.tipo === "pix") {
      passoDetalhe.append(h("h3", null, corridaId ? "Valor da gorjeta" : "Quanto"), chipsValor(corridaId ? [3, 5, 10, 20] : [10, 20, 50, 100]),
        nota(corridaId ? "Depois que a pessoa aceitar e mandar a chave Pix, você paga pelo app do banco." : "Se a pessoa aceitar, ela manda a chave Pix no chat e você paga pelo app do seu banco. O Help Floripa não toca no dinheiro."));
    } else if (S.tipo === "corrida" || S.tipo === "entrega") {
      passoDetalhe.append(h("h3", null, "Valor máximo"), chipsValor([20, 30, 50, 100]),
        nota(`A pessoa pede a ${S.tipo} quando quiser (até esse valor) e você paga direto para quem levar. Você acompanha no mapa.`));
    } else if (S.tipo === "produto") {
      passoDetalhe.appendChild(h("h3", null, "De qual loja ou delivery"));
      if (S.negocio) return pintarItens();
      const campo = h("input"); campo.type = "search"; campo.placeholder = "Nome da lanchonete ou loja"; campo.id = "prLoja";
      const l = h("label", "ent-campo"); l.append(h("span", null, "Lanches, roupas, flores, presentes..."), campo);
      const res = h("div", "ent-lista");
      passoDetalhe.append(l, res);
      let todos = [];
      try {
        const s = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("tipo", "in", ["delivery", "lojinha"]), fb.limit(120)));
        todos = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => Array.isArray(n.itens) && n.itens.some((i) => Number(i.preco) > 0) && !(n.ocultoAte && ms(n.ocultoAte) > Date.now()));
      } catch {}
      const sem = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const mostrar = () => {
        const q = sem(campo.value.trim());
        res.replaceChildren();
        const l2 = todos.filter((n) => !q || sem(`${n.nome} ${n.categoria} ${n.cidade} ${n.bairro}`).includes(q)).slice(0, 12);
        if (!l2.length) { res.appendChild(h("p", "ent-vazio", todos.length ? "Nenhuma loja com esse nome." : "Nenhuma loja com produtos à venda ainda.")); return; }
        l2.forEach((n) => {
          const b = h("button", "ent-res"); b.type = "button"; b.dataset.loja = n.id;
          const i = h("span", "ic"); avatar(i, n.foto, n.nome);
          const tx = h("span"); tx.append(h("b", null, n.nome || "Loja"), h("small", null, [n.tipo === "delivery" ? "Delivery" : "Shopping", n.bairro, n.cidade].filter(Boolean).join(" · ")));
          b.append(i, tx);
          b.addEventListener("click", () => { S.negocio = n; S.qtd = {}; pintarDetalhe(); });
          res.appendChild(b);
        });
      };
      campo.addEventListener("input", mostrar);
      if (negocio) { const n = todos.find((x) => x.id === negocio); if (n) { S.negocio = n; return pintarDetalhe(); } }
      mostrar();
    }
    atualizar();
  };
  const pintarItens = () => {
    const n = S.negocio;
    const cab = h("div", "ent-quem");
    const av = h("span", "avatar"); avatar(av, n.foto, n.nome);
    const tx = h("span"); tx.append(h("b", null, n.nome || "Loja"), h("small", null, "Toque em + para escolher"));
    const x = h("button", "x"); x.type = "button"; x.setAttribute("aria-label", "Trocar de loja"); x.appendChild(ic("fechar")); x.addEventListener("click", () => { S.negocio = null; S.qtd = {}; pintarDetalhe(); atualizar(); });
    cab.append(av, tx, x);
    passoDetalhe.appendChild(cab);
    const itens = h("div", "pr-itens");
    const total = h("p", "pr-total");
    const somar = () => { const t = n.itens.reduce((s, i, k) => s + (S.qtd[k] || 0) * (Number(i.preco) || 0), 0); total.textContent = t ? `Total: ${reaisP(t)} (+ entrega, se houver)` : ""; S.valor = Math.round(t * 100) / 100; atualizar(); };
    n.itens.forEach((it, k) => {
      if (!(Number(it.preco) > 0) || it.disponivel === false) return;
      const lin = h("div", "pr-item-l");
      const tx2 = h("span"); tx2.append(h("b", null, it.nome || "Item"), h("small", null, reaisP(it.preco)));
      const ctl = h("div", "pr-qtd");
      const menos = h("button", null, "−"); menos.type = "button"; menos.setAttribute("aria-label", "Menos");
      const q = h("strong", null, "0");
      const mais = h("button", null, "+"); mais.type = "button"; mais.setAttribute("aria-label", `Mais ${it.nome || "item"}`); mais.dataset.item = String(k);
      const mudar = (d) => { S.qtd[k] = Math.max(0, Math.min(9, (S.qtd[k] || 0) + d)); q.textContent = String(S.qtd[k]); if (Object.values(S.qtd).filter((v) => v > 0).length > 10) { S.qtd[k] -= d; q.textContent = String(S.qtd[k]); toast("Até 10 itens diferentes."); } somar(); };
      menos.addEventListener("click", () => mudar(-1)); mais.addEventListener("click", () => mudar(1));
      ctl.append(menos, q, mais);
      lin.append(tx2, ctl);
      itens.appendChild(lin);
    });
    passoDetalhe.append(itens, total, nota("Se a pessoa aceitar, ela escolhe onde receber (você não vê o endereço) e o pedido vai para a loja. Você combina o pagamento direto com a loja."));
    somar();
  };
  function nota(t) { const n = h("div", "ent-nota"); n.append(ic("ajuda"), h("span", null, t)); return n; }
  // 4) Mensagem
  const area = h("textarea"); area.maxLength = 300; area.placeholder = "Escreva um recado (opcional)"; area.id = "prMensagem";
  area.addEventListener("input", () => (S.mensagem = area.value));
  const lm = h("label", "ent-campo"); lm.append(h("span", null, "Mensagem"), area);
  passoMsg.append(h("h3", null, "Recado"), lm);

  async function mandar() {
    if (enviar.disabled) return;
    enviar.disabled = true; enviar.textContent = "Enviando...";
    const doc = {
      de: eu.uid, deNome: String(dados.nome || "").slice(0, 80), para: S.para.uid, paraNome: String(S.para.nome || "").slice(0, 80),
      tipo: S.tipo, mensagem: S.mensagem.trim().slice(0, 300), status: "pendente",
      criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
    };
    if (S.tipo === "mimo") doc.mimo = S.mimo;
    else doc.valor = Math.min(VALOR_MAX_PRESENTE, S.valor);
    if (S.tipo === "produto") {
      const n = S.negocio;
      doc.itens = n.itens.map((it, k) => ({ nome: String(it.nome || "Item").slice(0, 60), preco: Number(it.preco) || 0, qtd: S.qtd[k] || 0 })).filter((i) => i.qtd > 0).slice(0, 10);
      doc.negocioId = n.id; doc.negocioNome = String(n.nome || "").slice(0, 80); doc.donoId = n.donoId;
    }
    if (S.corridaId) doc.corridaId = S.corridaId;
    try {
      const ref = await fb.addDoc(fb.collection(fb.db, "presentes"), doc);
      await mandarMensagem(S.para.uid, { tipoArquivo: "cartao", cartao: { tipo: "presente", id: ref.id, ptipo: S.tipo, resumo: resumoPresente(doc).slice(0, 80), emoji: emojiPresente(doc) } }, `🎁 ${corridaId ? "Gorjeta" : "Presente"}: ${resumoPresente(doc)}`).catch(() => {});
      toast(corridaId ? "Gorjeta enviada!" : "Presente enviado! Agora é só esperar a resposta.");
      fechar(); aba = "enviados"; pintar();
    } catch (e) {
      enviar.disabled = false; atualizar();
      toast(e?.code === "permission-denied" ? "Não foi possível enviar: a pessoa não recebe presentes de você (ou esta função ainda está sendo liberada)." : "Não foi possível enviar: " + erroAmigavel(e));
    }
  }

  await pintarPara(); pintarTipo(); pintarDetalhe(); atualizar();
  if (para && para !== eu.uid) { const p = await perfil(para); if (p) await escolherPara(p); }
}
async function abrirGorjeta(corridaId) {
  try {
    const c = await fb.getDoc(fb.doc(fb.db, "corridas", corridaId));
    if (!c.exists() || c.data().clienteId !== eu.uid || c.data().status !== "concluida") { toast("Gorjeta só depois de uma entrega ou corrida concluída."); return; }
    abrirEnviar({ para: c.data().entregadorId, tipo: "pix", corridaId });
  } catch { toast("Não foi possível abrir."); }
}

// ---------- ver e responder ----------
async function abrirPresente(id) {
  const { corpo: c, fechar } = abrirTela("Presente");
  let parar = null;
  const pintarUm = async (p) => {
    c.replaceChildren();
    if (!p) { c.appendChild(h("p", "ent-vazio", "Presente não encontrado.")); return; }
    const recebi = p.para === eu.uid;
    const cart = h("div", "pr-cartao");
    cart.style.setProperty("--pc", TIPOS_PRESENTE[p.tipo]?.cor || "#00adee");
    cart.append(h("div", "pr-cartao-emoji", emojiPresente(p)), h("small", null, recebi ? `${p.deNome || "Alguém"} enviou para você` : `Você enviou para ${p.paraNome || "a pessoa"}`), h("h2", null, resumoPresente(p)));
    if (p.mensagem) cart.appendChild(h("p", "pr-cartao-msg", `“${p.mensagem}”`));
    const st = STATUS_PRESENTE[p.status] || ["", ""];
    cart.appendChild(h("span", "ent-etq " + st[1], st[0]));
    c.appendChild(cart);
    if (p.tipo === "produto" && p.itens?.length) {
      const r = h("div", "ent-resumo");
      p.itens.forEach((i) => { const d = h("div"); d.append(h("span", null, `${i.qtd}× ${i.nome}`), h("b", null, reaisP(i.qtd * i.preco))); r.appendChild(d); });
      c.appendChild(r);
    }
    c.appendChild(h("p", "ent-sub", proximoPasso(p, recebi)));
    const acoes = h("div");
    c.appendChild(acoes);
    const mudar = async (campos, ok) => {
      try { await fb.updateDoc(fb.doc(fb.db, "presentes", p.id), { ...campos, atualizadoEm: fb.serverTimestamp() }); if (ok) toast(ok); }
      catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
    };
    if (recebi && p.status === "pendente") {
      acoes.append(botao("Aceitar presente", "ent-btn ok", () => mudar({ status: "aceito", respondidoEm: fb.serverTimestamp() }, "Presente aceito!")),
        botao("Recusar", "ent-btn sec", () => confirmarHF({ titulo: "Recusar o presente?", texto: "A pessoa vê que você recusou.", ok: "Recusar", icone: "alerta", aoConfirmar: () => mudar({ status: "recusado", respondidoEm: fb.serverTimestamp() }, "Presente recusado") })));
    }
    if (!recebi && p.status === "pendente") acoes.appendChild(botao("Desistir do presente", "ent-btn perigo", () => mudar({ status: "cancelado" }, "Presente cancelado")));
    if (p.status === "aceito") {
      if (recebi && p.tipo === "pix") acoes.appendChild(botao("Mandar minha chave Pix", "ent-btn", () => mandarChavePix(p)));
      if (recebi && p.tipo === "produto") acoes.appendChild(botao("Escolher onde receber", "ent-btn", () => pedirNaLoja(p, fechar)));
      if (recebi && (p.tipo === "corrida" || p.tipo === "entrega")) acoes.appendChild(botao(p.tipo === "corrida" ? "Pedir a corrida agora" : "Pedir a entrega agora", "ent-btn", () => irPara(`entregas.html?presente=${encodeURIComponent(p.id)}`)));
      if (p.tipo === "pix") acoes.appendChild(botao(recebi ? "Já recebi" : "Já paguei", "ent-btn sec", () => mudar({ status: "concluido", concluidoEm: fb.serverTimestamp() }, "Pronto!")));
    }
    if (p.status === "usado") {
      if ((p.tipo === "corrida" || p.tipo === "entrega") && p.corridaId) acoes.appendChild(botao("Acompanhar no mapa", "ent-btn", () => irPara(`entregas.html?id=${encodeURIComponent(p.corridaId)}`)));
      if (p.tipo === "produto" && !recebi) acoes.appendChild(botao("Falar com a loja", "ent-btn", () => abrirConversaCom(p.donoId)));
      acoes.appendChild(botao("Marcar como concluído", "ent-btn sec", () => mudar({ status: "concluido", concluidoEm: fb.serverTimestamp() }, "Pronto!")));
    }
    acoes.appendChild(botao(recebi ? `Conversar com ${(p.deNome || "a pessoa").split(" ")[0]}` : `Conversar com ${(p.paraNome || "a pessoa").split(" ")[0]}`, "ent-btn sec", () => abrirConversaCom(recebi ? p.de : p.para)));
  };
  parar = fb.onSnapshot(fb.doc(fb.db, "presentes", id), (s) => pintarUm(s.exists() ? { id: s.id, ...s.data() } : null), () => pintarUm(null));
  c.closest(".ent-folha")?.addEventListener("fechada", () => parar?.());
}
async function abrirConversaCom(uid) {
  try { const id = await garantirConversa(fb, eu.uid, uid); const m = await import("./chat-gaveta.js?v=4"); m.abrirChat(`mensagens.html?conversa=${encodeURIComponent(id)}`); }
  catch (e) { toast("Não foi possível abrir a conversa: " + erroAmigavel(e)); }
}
// Dinheiro: quem recebe manda um cartão de Pix no chat de quem deu (com o valor do presente).
async function mandarChavePix(p) {
  let salvo = {};
  try { salvo = (await fb.getDoc(fb.doc(fb.db, "usuarios", eu.uid))).data()?.pix || {}; } catch {}
  const { corpo: c, fechar } = abrirTela("Receber por Pix");
  c.appendChild(h("p", "ent-sub", `${(p.deNome || "A pessoa").split(" ")[0]} recebe um cartão de Pix no chat com ${reaisP(p.valor)} para pagar pelo app do banco.`));
  const campo = (rot, v, id) => { const l = h("label", "ent-campo"); const i = h("input"); i.value = v || ""; i.id = id; l.append(h("span", null, rot), i); c.appendChild(l); return i; };
  const iChave = campo("Chave Pix (celular, e-mail, CPF ou aleatória)", salvo.chave, "prChave");
  const iNome = campo("Seu nome como aparece no banco", salvo.nome || dados.nome, "prNomePix");
  const iCid = campo("Cidade", salvo.cidade || dados.cidade, "prCidPix");
  c.appendChild(botao("Mandar no chat", "ent-btn", async () => {
    const tk = tipoChavePix(iChave.value);
    if (!tk) { toast("Confira a chave Pix."); iChave.focus(); return; }
    try {
      await mandarMensagem(p.de, { tipoArquivo: "cartao", cartao: { tipo: "pix", chave: tk.chave, tipoChave: tk.tipo, nome: iNome.value.trim().slice(0, 60), cidade: iCid.value.trim().slice(0, 40), valor: Number(p.valor) || null, descricao: "Presente" } }, `Pix: ${reaisP(p.valor)}`);
      fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { pix: { chave: tk.chave, nome: iNome.value.trim().slice(0, 60), cidade: iCid.value.trim().slice(0, 40) } }, { merge: true }).catch(() => {});
      toast("Chave enviada no chat"); fechar();
    } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  }));
}
// Produto: quem recebe escolhe onde receber; o pedido vai como cartão de pedido para a loja (só a loja vê o endereço).
async function pedirNaLoja(p) {
  const { corpo: c, fechar } = abrirTela("Onde receber");
  c.appendChild(h("p", "ent-sub", `O pedido vai para ${p.negocioNome || "a loja"} com o seu endereço. ${(p.deNome || "Quem enviou").split(" ")[0]} não vê o endereço e combina o pagamento direto com a loja.`));
  const campo = (rot, v, id, max = 120) => { const l = h("label", "ent-campo"); const i = h("input"); i.value = v || ""; i.id = id; i.maxLength = max; l.append(h("span", null, rot), i); c.appendChild(l); return i; };
  const iRua = campo("Rua e número", [dados.rua, dados.numero].filter(Boolean).join(", "), "prRua");
  const iBairro = campo("Bairro", dados.bairro, "prBairro", 60);
  const iCid = campo("Cidade", dados.cidade, "prCidade", 60);
  const iRef = campo("Complemento / referência", dados.complemento, "prRef", 100);
  const bt = botao("Enviar pedido para a loja", "ent-btn", async () => {
    if (iRua.value.trim().length < 4) { toast("Escreva a rua e o número."); iRua.focus(); return; }
    bt.disabled = true;
    const endereco = [iRua.value.trim(), iBairro.value.trim(), iCid.value.trim(), iRef.value.trim()].filter(Boolean).join(" · ").slice(0, 200);
    const itens = (p.itens || []).map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco }));
    const total = itens.reduce((s, i) => s + i.qtd * i.preco, 0);
    let tipoNeg = "delivery";
    try { tipoNeg = (await fb.getDoc(fb.doc(fb.db, "negocios", p.negocioId))).data()?.tipo || "delivery"; } catch {}
    const cartao = {
      tipo: tipoNeg, titulo: `Pedido · ${p.negocioNome || "Loja"}`, sub: `Presente de ${p.deNome || "alguém"}`, preco: reaisP(total),
      link: `${tipoNeg === "lojinha" ? "shopping" : "delivery"}.html?negocio=${encodeURIComponent(p.negocioId)}&de=mensagens`,
      presente: { id: p.id, deNome: String(p.deNome || "").slice(0, 80), deId: p.de },
      pedido: { itens, subtotal: total, taxa: 0, total, modo: "entrega", endereco, pagamento: "", troco: null, cupom: null, prazo: "",
        obs: `🎁 Presente de ${p.deNome || "alguém"}. O pagamento é combinado com quem enviou o presente.` }
    };
    try {
      await mandarMensagem(p.donoId, { tipoArquivo: "cartao", cartao }, `Pedido: ${itens.length} ${itens.length === 1 ? "item" : "itens"} (presente)`);
      await fb.updateDoc(fb.doc(fb.db, "presentes", p.id), { status: "usado", usadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp() });
      toast("Pedido enviado para a loja!"); fechar();
    } catch (e) { bt.disabled = false; toast("Não foi possível enviar: " + erroAmigavel(e)); }
  });
  bt.id = "prPedirLoja";
  c.appendChild(bt);
}
