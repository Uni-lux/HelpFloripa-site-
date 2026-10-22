// =====================================================
// Ajuda e suporte (suporte.html): chamados da pessoa com a equipe.
// suporte/{id} + suporte/{id}/mensagens. Quem está suspenso também consegue
// abrir chamado (para contestar). A equipe responde pelo painel e também pode abrir
// uma conversa com a pessoa: tudo aparece como "Suporte Help Floripa" (conta oficial).
// - Início: atalhos (Novo chamado, Central de ajuda, Denunciar, Contestar), avisos da equipe e
//   os chamados em abas (Em andamento | Encerrados), com protocolo e situação.
// - Novo chamado: assunto em cartões com dica de cada um; prioridade e prazo da resposta (suporte-fila.js: golpe =
//   urgente 2 h, pagamento/contestação/plano Pro = alta 8 h, o resto 24 h); enquanto a pessoa escreve, as respostas da
//   Central de Ajuda que combinam aparecem ("Resolveu" não abre chamado); até 3 chamados em andamento por pessoa.
// - Conversa: etapas (Recebido → Em atendimento → Respondido → Encerrado), balões por dia,
//   ⋯ com Encerrar/Reabrir, Reportar este atendimento e Copiar protocolo; encerrado: nota de 1 a 5
//   (suporte_notas/{chamado}).
// - Reportar atendimento: reportes/atendimento_{chamado}_{uid} (só moderação e donos leem). Com as
//   regras antigas vira um chamado "Denúncia" com o reporte, para não se perder.
// - Denunciar: busca a pessoa e abre a denúncia do perfil (denuncias.js).
// Avisos da equipe (avisos/{id}); ?aviso=ID abre um aviso e ?chamado=ID um chamado
// (links das notificações). Abrir marca como lido (avisos.lidoEm / usuarios.suporteLido).
// =====================================================
import { $, el, icone, toast, erroAmigavel, abrirFolha, fecharFolha, abrirOpcoes, linhaPessoa, fb, eu, dados, iniciarRede, montarBarraRede, pintarBarraRede } from "./rede.js?v=56";
import { SUPORTE, seloOficial, fotoSuporte, marcarChamadoLido } from "./avisos-equipe.js?v=1";
import { buscarPessoas } from "./pessoas.js?v=3";
import { abrirDenuncia } from "./denuncias.js?v=5";
import { ligarVoltar } from "./voltar.js?v=6";
import { prepararAnexo, blocoAnexo, previaAnexo, aceitos } from "./anexos-suporte.js?v=2";
import { PRIORIDADES, prioridadeDe, prioridadeChamado, textoPrevisao, MAX_ABERTOS } from "./suporte-fila.js?v=1";
import { palavrasDe } from "./busca.js?v=1";
import { lerPlano, nivelPlano } from "./planos-base.js?v=3";
// O voltar fecha as janelas desta página (também dentro das Mensagens), sem depender da cópia do firebase.js no aparelho.
ligarVoltar();

const CATS = [
  ["conta", "Minha conta", "Acesso, senha, e-mail", "chave", "#00adee", "Se não consegue entrar, diga o e-mail da conta e o que aparece na tela. Nunca mande a sua senha."],
  ["negocio", "Negócio ou anúncio", "Perfil, cardápio, vitrine", "maleta", "#2fbf71", "Diga qual negócio (nome) e o que você tentou fazer. Se puder, conte em qual página estava."],
  ["golpe", "Golpe ou fraude", "Cobrança suspeita, perfil falso", "alerta", "#e5484d", "Não pague nada adiantado e não saia do chat do Help Floripa. Conte quem, quando e quanto foi pedido."],
  ["denuncia", "Acompanhar denúncia", "Saber o que foi feito", "restringir", "#8b5cf6", "Diga o nome ou @ de quem você denunciou e mais ou menos quando."],
  ["contestacao", "Contestar decisão", "Suspensão, banimento, remoção", "sair", "#ec835a", "Explique por que você acha que a decisão está errada. A equipe revisa o caso e responde por aqui."],
  ["pagamento", "Pagamento", "Cobrança ou plano", "doc", "#fab219", "Diga a data, o valor e a forma de pagamento. Nunca envie dados completos do cartão."],
  ["sugestao", "Sugestão ou elogio", "Ideias para melhorar", "estrela", "#ff8a00", "Conte a sua ideia: o que você gostaria de ver no Help Floripa?"],
  ["outro", "Outro assunto", "Qualquer outra coisa", "ajuda", "#7f8c96", ""]
];
const CAT = Object.fromEntries(CATS.map((c) => [c[0], c]));
const nomeCat = (k) => CAT[k]?.[1] || "Outro";
const ST = { aberto: "Esperando a equipe", atendimento: "Em atendimento", respondido: "A equipe respondeu", fechado: "Encerrado" };
const MOTIVOS = [["demora", "Demorou demais para responder"], ["grosseria", "Fui tratado com grosseria"], ["nao_resolveu", "Não resolveu o meu problema"], ["errado", "Passou informação errada"], ["dados", "Pediu senha, código ou dados pessoais"], ["outro", "Outro motivo"]];
const ms = (t) => t?.toMillis?.() ?? 0;
const quando = (t) => (ms(t) ? new Date(ms(t)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
const hora = (t) => (ms(t) ? new Date(ms(t)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "");
const relativo = (t) => {
  const s = (Date.now() - ms(t)) / 1000;
  if (!ms(t)) return "";
  if (s < 60) return "agora"; if (s < 3600) return `há ${Math.round(s / 60)} min`; if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  if (s < 7 * 86400) return `há ${Math.round(s / 86400)} d`;
  return new Date(ms(t)).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
};
// Protocolo curto do chamado (6 letras/números do id).
export const protocolo = (id) => "#" + String(id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
// Situação para quem abriu: com alguém da equipe cuidando e sem resposta ainda = "Em atendimento".
const situacao = (c) => (c.status === "aberto" && c.responsavel ? "atendimento" : c.status);
let chamados = [], avisos = [], atual = null, aba = "andamento";
let lidos = {};
const novaResposta = (c) => c.status === "respondido" && c.ultimaDe === "equipe" && ms(c.atualizadoEm) > ms(lidos[c.id]);

// Nome do suporte com o selo de conta oficial.
function nomeOficial(tag = "strong") { const n = el(tag, "sup-oficial-nome", SUPORTE.nome); n.appendChild(seloOficial()); return n; }

// ---------- início ----------
let nivelEu = 0;
async function carregar() {
  lerPlano(fb, eu.uid).then((p) => { nivelEu = nivelPlano(p); pintarPrevisao(); }).catch(() => {});
  const [s, sa] = await Promise.all([
    fb.getDocs(fb.query(fb.collection(fb.db, "suporte"), fb.where("uid", "==", eu.uid), fb.limit(50))).catch(() => ({ docs: [] })),
    fb.getDocs(fb.query(fb.collection(fb.db, "avisos"), fb.where("uid", "==", eu.uid), fb.limit(30))).catch(() => ({ docs: [] }))
  ]);
  chamados = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
  avisos = sa.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).sort((a, b) => ms(b.em) - ms(a.em));
  pintarLista();
}
function pintarLista() {
  const lista = $("supLista");
  $("supCarregando").hidden = true; lista.hidden = false;
  lista.replaceChildren();
  if (avisos.length) {
    lista.appendChild(el("h2", "sup-secao", "Avisos da equipe"));
    avisos.slice(0, 10).forEach((a) => {
      const b = el("button", "sup-item sup-aviso" + (a.lidoEm == null ? " novo" : "") + (a.tipo === "grave" ? " grave" : a.tipo === "alerta" ? " alerta" : "")); b.type = "button";
      const ic = el("span", "sup-av"); ic.appendChild(fotoSuporte());
      const tx = el("span", "sup-tx");
      const l1 = el("span", "l1"); l1.append(nomeOficial("span"));
      if (a.lidoEm == null) l1.appendChild(el("span", "sup-st novo", "Novo"));
      l1.appendChild(el("small", null, relativo(a.em)));
      tx.append(l1, el("strong", null, a.titulo || "Aviso"));
      if (a.texto) tx.appendChild(el("span", "sup-trecho", a.texto));
      b.append(ic, tx);
      b.addEventListener("click", () => abrirAviso(a));
      lista.appendChild(b);
    });
  }
  lista.appendChild(el("h2", "sup-secao", "Seus chamados"));
  const andamento = chamados.filter((c) => c.status !== "fechado"), encerrados = chamados.filter((c) => c.status === "fechado");
  if (chamados.length) {
    const abas = el("div", "sup-abas"); abas.setAttribute("role", "tablist");
    [["andamento", "Em andamento", andamento.length], ["encerrados", "Encerrados", encerrados.length]].forEach(([id, nome, n]) => {
      const b = el("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(aba === id));
      b.append(document.createTextNode(nome), el("b", null, String(n)));
      b.addEventListener("click", () => { aba = id; pintarLista(); });
      abas.appendChild(b);
    });
    lista.appendChild(abas);
  }
  const mostrar = aba === "andamento" ? andamento : encerrados;
  if (!mostrar.length) {
    const v = el("div", "sup-vazio");
    v.append(icone(chamados.length ? "check" : "chat", "i"), el("b", null, chamados.length ? (aba === "andamento" ? "Nenhum chamado em andamento" : "Nenhum chamado encerrado") : "Você ainda não abriu nenhum chamado"),
      el("span", null, chamados.length ? "Tudo em dia por aqui." : "Precisa de ajuda? Toque em Novo chamado e conte o que aconteceu."));
    lista.appendChild(v);
    return;
  }
  mostrar.forEach((c) => {
    const nova = novaResposta(c), st = situacao(c);
    const b = el("button", "sup-item" + (nova ? " novo" : "")); b.type = "button";
    const cat = CAT[c.categoria] || CAT.outro;
    const ic = el("span", "sup-ic"); ic.style.setProperty("--c", c.abertoPor ? "var(--accent)" : cat[4]); ic.appendChild(c.abertoPor ? fotoSuporte() : icone(cat[3], "i"));
    if (c.abertoPor) ic.classList.add("sup-av");
    const tx = el("span", "sup-tx");
    const l1 = el("span", "l1");
    l1.append(el("span", "sup-st " + (nova ? "novo" : st), nova ? "Nova resposta" : ST[st] || st), el("small", "sup-proto", protocolo(c.id)), el("small", null, relativo(c.atualizadoEm)));
    tx.append(l1, el("strong", null, c.assunto), el("small", null, c.abertoPor ? "Conversa aberta pelo suporte" : nomeCat(c.categoria)));
    b.append(ic, tx);
    b.addEventListener("click", () => abrir(c));
    lista.appendChild(b);
  });
}

// ---------- novo chamado ----------
let catEscolhida = "conta";
function pintarCats() {
  $("supCategoria").replaceChildren(...CATS.map(([v, n]) => new Option(n, v)));
  $("supCategoria").value = catEscolhida;
  $("supCats").replaceChildren(...CATS.map(([v, nome, sub, ic, cor]) => {
    const b = el("button", "sup-cat"); b.type = "button"; b.setAttribute("role", "radio"); b.dataset.cat = v;
    b.setAttribute("aria-checked", String(v === catEscolhida)); b.style.setProperty("--c", cor);
    const i = el("span", "ic"); i.appendChild(icone(ic, "i"));
    b.append(i, el("b", null, nome), el("small", null, sub));
    b.addEventListener("click", () => escolherCat(v));
    return b;
  }));
  const dica = CAT[catEscolhida]?.[5];
  $("supDica").hidden = !dica;
  $("supDica").replaceChildren(icone("ajuda", "i s"), el("span", null, dica || ""));
}
function escolherCat(v) { catEscolhida = CAT[v] ? v : "outro"; pintarCats(); pintarPrevisao(); }
// Prioridade e prazo que a pessoa vê antes de enviar.
function pintarPrevisao() {
  const box = $("supPrevisao"); if (!box) return;
  const k = prioridadeDe(catEscolhida, nivelEu), P = PRIORIDADES[k];
  box.hidden = false;
  box.replaceChildren(el("b", k, `Prioridade ${P.nome.toLowerCase()}`), el("span", null, `a equipe responde em até ${P.horas} h${k === "alta" && nivelEu >= 2 ? " (atendimento prioritário do seu plano)" : ""}`));
}
// ---------- antes de abrir: respostas da Central de Ajuda (ajuda.html) que combinam com o que a pessoa escreve ----------
let artigosP = null;
function artigos() {
  return (artigosP ||= fetch("ajuda.html").then((r) => r.text()).then((html) => {
    const d = new DOMParser().parseFromString(html, "text/html");
    return [...d.querySelectorAll("details")].map((x) => {
      const pergunta = x.querySelector("summary")?.textContent.trim() || "", resp = x.querySelector(".resp");
      return pergunta && resp ? { pergunta, html: resp.innerHTML, palavras: new Set(palavrasDe(pergunta + " " + resp.textContent)) } : null;
    }).filter(Boolean);
  }).catch(() => []));
}
// Palavras parecidas contam (as 5 primeiras letras: "cardapio" e "cardápios").
const raiz = (p) => p.slice(0, 5);
let esperaSug = null;
async function pintarSugestoes() {
  const box = $("supSugestoes"); if (!box) return;
  const minhas = [...new Set(palavrasDe($("supAssunto").value + " " + $("supTexto").value).filter((p) => p.length >= 4).map(raiz))];
  if (minhas.length < 2) { box.hidden = true; return; }
  const lista = (await artigos()).map((a) => {
    const deles = new Set([...a.palavras].map(raiz));
    return { a, n: minhas.filter((p) => deles.has(p)).length };
  }).filter((x) => x.n >= 2).sort((x, y) => y.n - x.n).slice(0, 3);
  if (!lista.length) { box.hidden = true; return; }
  const cab = el("h3", null, "Isso pode resolver agora"), sub = el("p", null, "Respostas da Central de Ajuda para o que você escreveu. Se não resolver, é só enviar o chamado.");
  box.replaceChildren(cab, sub, ...lista.map(({ a }) => {
    const d = el("details"); const sm = el("summary", null, a.pergunta); const r = el("div", "resp"); r.innerHTML = a.html;
    r.querySelectorAll("a").forEach((ln) => { ln.target = "_blank"; ln.rel = "noopener"; });
    const ok = el("button", "sup-resolveu", "Resolveu, não preciso do chamado"); ok.type = "button";
    ok.addEventListener("click", () => {
      try { const k = "hf-sup-resolvidos"; localStorage.setItem(k, String(Number(localStorage.getItem(k) || 0) + 1)); } catch {}
      fecharFolha("folhaNovo"); $("supAssunto").value = ""; $("supTexto").value = ""; box.hidden = true;
      toast("Que bom que resolveu! Se precisar, é só abrir um chamado.");
    });
    d.append(sm, r, ok); return d;
  }));
  box.hidden = false;
}
const agendarSugestoes = () => { clearTimeout(esperaSug); esperaSug = setTimeout(pintarSugestoes, 450); };
$("supAssunto").addEventListener("input", agendarSugestoes);
$("supTexto").addEventListener("input", agendarSugestoes);
function novoChamado({ categoria = catEscolhida, assunto = "", texto = "" } = {}) {
  escolherCat(categoria);
  if (assunto) $("supAssunto").value = assunto.slice(0, 120);
  // Texto pronto (ex.: formulário da página Contato): conta os caracteres e busca respostas da Central.
  if (texto) { $("supTexto").value = texto.slice(0, 2000); $("supTexto").dispatchEvent(new Event("input")); }
  abrirFolha("folhaNovo");
}
$("btnNovo").addEventListener("click", () => novoChamado());
$("btnContestar").addEventListener("click", () => novoChamado({ categoria: "contestacao", assunto: $("supAssunto").value || "Contestar suspensão, banimento ou remoção" }));
$("supTexto").addEventListener("input", () => { $("supCont").textContent = `${$("supTexto").value.length}/2000`; });
$("supEnviar").addEventListener("click", async () => {
  const assunto = $("supAssunto").value.trim(), texto = $("supTexto").value.trim(), categoria = catEscolhida;
  if (assunto.length < 3) { toast("Escreva um resumo do assunto."); $("supAssunto").focus(); return; }
  if (texto.length < 10) { toast("Conte um pouco mais (mínimo de 10 caracteres)."); $("supTexto").focus(); return; }
  // Até 3 chamados em andamento por pessoa (a fila nacional fica justa para todo mundo).
  if (chamados.filter((c) => c.status !== "fechado" && !c.abertoPor).length >= MAX_ABERTOS) { toast(`Você já tem ${MAX_ABERTOS} chamados em andamento. Continue por um deles ou espere a equipe responder.`); return; }
  const b = $("supEnviar"); b.disabled = true;
  try {
    const id = await criarChamado({ assunto, categoria, texto });
    // Anexos vão logo depois, como mensagens do chamado (regras novas; sem elas, o chamado vai sem eles).
    let semAnexo = false;
    for (const a of anexosNovo) {
      try { await fb.addDoc(fb.collection(fb.db, "suporte", id, "mensagens"), { autorId: eu.uid, equipe: false, texto: "", anexo: a, em: fb.serverTimestamp() }); }
      catch (e) { if (e?.code === "permission-denied") { semAnexo = true; break; } throw e; }
    }
    anexosNovo = []; pintarAnexosNovo();
    if (semAnexo) setTimeout(() => toast("Os anexos ainda não podem ser enviados (atualização do sistema pendente). Descreva no texto, por enquanto."), 3500);
    fecharFolha("folhaNovo");
    $("supAssunto").value = ""; $("supTexto").value = ""; $("supCont").textContent = "0/2000";
    toast(`Chamado ${protocolo(id)} enviado. A equipe responde por aqui e você recebe um aviso.`);
    aba = "andamento";
    await carregar();
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
});
// ---------- anexos (fotos, vídeos e PDF) ----------
let anexosNovo = [], anexoResp = null;
async function escolherArquivos(input, max, aoPronto) {
  input.accept = aceitos();
  input.onchange = async () => {
    const arqs = [...(input.files || [])].slice(0, max);
    input.value = "";
    for (const f of arqs) {
      try { toast("Preparando o anexo..."); aoPronto(await prepararAnexo(f, `suporte/${eu.uid}`)); toast("Anexo pronto"); }
      catch (e) { toast(e?.message || "Não foi possível usar esse arquivo."); }
    }
  };
  input.click();
}
function pintarAnexosNovo() {
  $("supAnexos").replaceChildren(...anexosNovo.map((a, i) => previaAnexo(a, () => { anexosNovo.splice(i, 1); pintarAnexosNovo(); })));
  $("supAnexar").hidden = anexosNovo.length >= 3;
}
$("supAnexar").addEventListener("click", () => escolherArquivos($("supArquivo"), 3 - anexosNovo.length, (a) => { if (anexosNovo.length < 3) anexosNovo.push(a); pintarAnexosNovo(); }));
function pintarAnexoResp() { $("chAnexoPrevia").replaceChildren(...(anexoResp ? [previaAnexo(anexoResp, () => { anexoResp = null; pintarAnexoResp(); })] : [])); }
$("chAnexar").addEventListener("click", () => escolherArquivos($("chArquivo"), 1, (a) => { anexoResp = a; pintarAnexoResp(); $("chTexto").focus(); }));
// Chamado e primeira mensagem vão juntos: se algo falhar, nada fica pela metade.
async function criarChamado({ assunto, categoria, texto }) {
  const prioridade = prioridadeDe(categoria, nivelEu);
  try { return await gravarChamado({ assunto, categoria, texto, prioridade }); }
  catch (e) { if (e?.code !== "permission-denied") throw e; return gravarChamado({ assunto, categoria, texto }); } // regras antigas: sem a prioridade
}
async function gravarChamado({ assunto, categoria, texto, prioridade }) {
  const ref = fb.doc(fb.collection(fb.db, "suporte"));
  const lote = fb.writeBatch(fb.db);
  lote.set(ref, { ...(prioridade ? { prioridade } : {}), uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), assunto: assunto.slice(0, 120), categoria, status: "aberto", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
  lote.set(fb.doc(fb.db, "suporte", ref.id, "mensagens", "inicio"), { autorId: eu.uid, equipe: false, texto: texto.slice(0, 2000), em: fb.serverTimestamp() });
  await lote.commit();
  return ref.id;
}

// ---------- conversa ----------
const ETAPAS = [["recebido", "Recebido"], ["atendimento", "Em atendimento"], ["respondido", "Respondido"], ["fechado", "Encerrado"]];
function pintarEtapas(c) {
  const st = situacao(c);
  const nivel = st === "fechado" ? 3 : st === "respondido" ? 2 : st === "atendimento" || c.atendidoPor ? 1 : 0;
  $("chEtapas").replaceChildren(...ETAPAS.map(([, nome], i) => { const li = el("li", (i <= nivel ? "feito" : "") + (i === nivel ? " atual" : ""), nome); if (i === nivel) li.setAttribute("aria-current", "step"); return li; }));
}
function pintarCompositor(c) {
  const fechado = c.status === "fechado";
  $("chResponder").hidden = fechado;
  $("chFechadoBox").hidden = !fechado;
}
async function abrir(c) {
  atual = c;
  $("tChamado").textContent = c.assunto;
  const esperando = c.status === "aberto" && !c.primeiraRespostaEm && !c.abertoPor;
  $("chMeta").textContent = `${protocolo(c.id)} · ${c.abertoPor ? "Aberto pelo suporte" : nomeCat(c.categoria)} · ${quando(c.criadoEm)}${esperando ? " · " + textoPrevisao(c, nivelEu) : ""}`;
  pintarEtapas(c); pintarCompositor(c);
  $("chNota").replaceChildren();
  const box = $("chMsgs"); box.replaceChildren(el("div", "lista-vazia", "Carregando..."));
  abrirFolha("folhaChamado");
  if (novaResposta(c) || c.ultimaDe === "equipe") { lidos = { ...lidos, [c.id]: { toMillis: () => Date.now() } }; marcarChamadoLido(fb, fb.db, eu.uid, c.id); }
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "suporte", c.id, "mensagens"), fb.orderBy("em", "asc"))).catch(() => ({ docs: [] }));
  if (atual !== c) return;
  const nos = [];
  let dia = "";
  s.docs.forEach((d) => {
    const m = d.data({ serverTimestamps: "estimate" });
    const dd = ms(m.em) ? new Date(ms(m.em)).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long" }) : "";
    if (dd && dd !== dia) { dia = dd; nos.push(el("div", "sup-dia", dd)); }
    const ax = blocoAnexo(m.anexo);
    if (!m.equipe) { const b = el("div", "sup-msg meu", m.texto || ""); if (ax) b.appendChild(ax); b.appendChild(el("small", null, hora(m.em))); nos.push(b); return; }
    const linha = el("div", "sup-linha-equipe");
    const av = el("span", "sup-av"); av.appendChild(fotoSuporte());
    const b = el("div", "sup-msg equipe");
    b.append(nomeOficial("b"), el("div", null, m.texto || ""));
    if (ax) b.appendChild(ax);
    b.appendChild(el("small", null, hora(m.em)));
    linha.append(av, b);
    nos.push(linha);
  });
  if (c.status === "aberto" && c.ultimaDe === "usuario") nos.push(el("div", "sup-sistema", c.responsavel ? "Alguém da equipe já está cuidando do seu chamado." : "Recebemos o seu chamado. Você recebe um aviso quando a equipe responder."));
  if (c.status === "fechado") nos.push(el("div", "sup-sistema", "Chamado encerrado. Se precisar, é só reabrir."));
  box.replaceChildren(...nos);
  if (c.status === "fechado" && !c.abertoPor) pintarNota(c);
  requestAnimationFrame(() => { const corpo = box.closest(".folha-corpo"); if (corpo) corpo.scrollTop = corpo.scrollHeight; });
  carregar();
}
// Nota do atendimento (uma vez, depois de encerrado).
const ESTRELA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z"/></svg>';
async function pintarNota(c) {
  const alvo = $("chNota");
  const ja = await fb.getDoc(fb.doc(fb.db, "suporte_notas", c.id)).then((s) => (s.exists() ? s.data() : null)).catch(() => null);
  if (atual !== c) return;
  if (ja) { const f = el("div", "sup-nota feita"); f.append(document.createTextNode("Você avaliou este atendimento: "), el("b", null, "★".repeat(ja.nota) + "☆".repeat(5 - ja.nota))); alvo.replaceChildren(f); return; }
  const box = el("div", "sup-nota");
  box.append(el("h3", null, "Como foi o atendimento?"), el("p", null, "A sua nota ajuda a equipe a melhorar."));
  const est = el("div", "sup-estrelas"); est.setAttribute("role", "radiogroup"); est.setAttribute("aria-label", "Nota de 1 a 5");
  let nota = 0;
  const NOMES = ["Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];
  for (let i = 1; i <= 5; i++) {
    const b = el("button"); b.type = "button"; b.innerHTML = ESTRELA; b.setAttribute("aria-label", `${i} - ${NOMES[i - 1]}`); b.setAttribute("role", "radio");
    b.addEventListener("click", () => { nota = i; est.querySelectorAll("button").forEach((x, k) => { x.classList.toggle("on", k < i); x.setAttribute("aria-checked", String(k === i - 1)); }); rot.textContent = NOMES[i - 1]; enviar.disabled = false; });
    est.appendChild(b);
  }
  const rot = el("p", null, "Toque nas estrelas");
  const com = el("textarea"); com.maxLength = 500; com.placeholder = "Quer contar mais? (opcional)";
  const enviar = el("button", "btn pri", "Enviar avaliação"); enviar.type = "button"; enviar.disabled = true;
  enviar.addEventListener("click", async () => {
    enviar.disabled = true;
    try {
      await fb.setDoc(fb.doc(fb.db, "suporte_notas", c.id), { uid: eu.uid, nota, ...(com.value.trim() ? { comentario: com.value.trim().slice(0, 500) } : {}), ...(c.atendidoPor ? { atendidoPor: c.atendidoPor } : {}), criadoEm: fb.serverTimestamp() });
      toast("Obrigado pela avaliação!");
      pintarNota(c);
    } catch (e) {
      enviar.disabled = false;
      toast(e?.code === "permission-denied" ? "A avaliação do atendimento ainda não está disponível. Tente de novo em alguns dias." : "Não foi possível enviar: " + erroAmigavel(e));
    }
  });
  box.append(est, rot, com, enviar);
  alvo.replaceChildren(box);
}
// O campo cresce com o texto.
$("chTexto").addEventListener("input", () => { const t = $("chTexto"); t.style.height = "auto"; t.style.height = Math.min(140, t.scrollHeight) + "px"; });
$("chTexto").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("chEnviar").click(); } });
$("chEnviar").addEventListener("click", async () => {
  const texto = $("chTexto").value.trim();
  if ((!texto && !anexoResp) || !atual) return;
  const b = $("chEnviar"); b.disabled = true;
  try {
    const col = fb.collection(fb.db, "suporte", atual.id, "mensagens");
    try { await fb.addDoc(col, { autorId: eu.uid, equipe: false, texto, ...(anexoResp ? { anexo: anexoResp } : {}), em: fb.serverTimestamp() }); }
    catch (e) {
      // Regras do ar ainda sem anexos: manda só o texto (se tiver) e avisa.
      if (e?.code !== "permission-denied" || !anexoResp) throw e;
      if (texto) await fb.addDoc(col, { autorId: eu.uid, equipe: false, texto, em: fb.serverTimestamp() });
      toast("O anexo ainda não pode ser enviado (atualização do sistema pendente)." + (texto ? " A mensagem foi enviada." : ""));
      if (!texto) return;
    }
    anexoResp = null; pintarAnexoResp();
    await fb.updateDoc(fb.doc(fb.db, "suporte", atual.id), { status: "aberto", atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    $("chTexto").value = ""; $("chTexto").style.height = ""; Object.assign(atual, { status: "aberto", ultimaDe: "usuario" });
    await abrir(atual);
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
});
async function mudarStatus(novo) {
  if (!atual) return;
  try {
    await fb.updateDoc(fb.doc(fb.db, "suporte", atual.id), { status: novo, atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    atual.status = novo; toast(novo === "fechado" ? "Chamado encerrado" : "Chamado reaberto");
    await abrir(atual);
  } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
}
$("chFechar").addEventListener("click", () => mudarStatus(atual?.status === "fechado" ? "aberto" : "fechado"));
$("chReabrir").addEventListener("click", () => mudarStatus("aberto"));
$("chMais").addEventListener("click", () => {
  if (!atual) return;
  const c = atual;
  abrirOpcoes(`Chamado ${protocolo(c.id)}`, [
    c.status === "fechado" ? { rotulo: "Reabrir chamado", sub: "Continuar a conversa com a equipe", icone: "chat", fn: () => mudarStatus("aberto") }
      : { rotulo: "Encerrar chamado", sub: "O seu problema foi resolvido", icone: "check", fn: () => mudarStatus("fechado") },
    { rotulo: "Copiar protocolo", sub: `${protocolo(c.id)} · para falar deste chamado`, icone: "doc", fn: () => navigator.clipboard?.writeText(protocolo(c.id)).then(() => toast("Protocolo copiado"), () => toast(protocolo(c.id))) },
    { rotulo: "Reportar este atendimento", sub: "Vai para a moderação e os responsáveis, não para quem atendeu", icone: "alerta", perigo: true, fn: () => abrirReportar(c) }
  ]);
});

// ---------- reportar atendimento ----------
let motivoRep = "";
function abrirReportar(c) {
  motivoRep = "";
  $("repDetalhe").value = "";
  $("repMotivos").replaceChildren(...MOTIVOS.map(([v, nome]) => {
    const b = el("button", "sup-motivo", nome); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
    b.addEventListener("click", () => { motivoRep = v; $("repMotivos").querySelectorAll(".sup-motivo").forEach((x) => x.setAttribute("aria-checked", String(x === b))); });
    return b;
  }));
  $("repEnviar").onclick = () => enviarReporte(c);
  abrirFolha("folhaReportar");
}
async function enviarReporte(c) {
  if (!motivoRep) { toast("Escolha o que aconteceu."); return; }
  const detalhe = $("repDetalhe").value.trim().slice(0, 1000);
  const b = $("repEnviar"); b.disabled = true;
  try {
    const id = `atendimento_${c.id}_${eu.uid}`;
    await fb.setDoc(fb.doc(fb.db, "reportes", id), {
      tipo: "atendimento", chamadoId: c.id, assunto: String(c.assunto || "").slice(0, 120), autorId: eu.uid,
      ...(c.atendidoPor || c.responsavel ? { alvoId: c.atendidoPor || c.responsavel } : {}),
      motivo: motivoRep, ...(detalhe ? { detalhe } : {}), status: "novo", criadoEm: fb.serverTimestamp()
    });
    fecharFolha("folhaReportar");
    toast("Reporte enviado para a moderação. Obrigado por avisar.");
  } catch (e) {
    if (e?.code !== "permission-denied") { toast("Não foi possível enviar: " + erroAmigavel(e)); b.disabled = false; return; }
    // Regras antigas: o reporte vai como chamado de denúncia (a equipe vê e encaminha).
    try {
      const nome = MOTIVOS.find((m) => m[0] === motivoRep)?.[1] || "Outro motivo";
      await criarChamado({ categoria: "denuncia", assunto: `Reporte do atendimento ${protocolo(c.id)}`, texto: `Reporte do atendimento do chamado ${protocolo(c.id)} ("${c.assunto}").\nMotivo: ${nome}.${detalhe ? "\n\n" + detalhe : ""}` });
      fecharFolha("folhaReportar");
      toast("Reporte enviado. Obrigado por avisar.");
      carregar();
    } catch (e2) { toast("Não foi possível enviar: " + erroAmigavel(e2)); }
  } finally { b.disabled = false; }
}

// ---------- denunciar alguém ----------
let tempoDen = 0;
$("btnDenunciar").addEventListener("click", () => { $("denBusca").value = ""; $("denLista").replaceChildren(); abrirFolha("folhaDenunciar"); setTimeout(() => $("denBusca").focus(), 80); });
$("denBusca").addEventListener("input", () => {
  clearTimeout(tempoDen);
  tempoDen = setTimeout(async () => {
    const t = $("denBusca").value.trim();
    if (t.length < 2) { $("denLista").replaceChildren(); return; }
    const achados = (await buscarPessoas(fb, t, { limite: 15 })).filter((p) => p.uid !== eu.uid);
    if ($("denBusca").value.trim() !== t) return;
    $("denLista").replaceChildren(...(achados.length ? achados.slice(0, 15).map((p) => linhaPessoa({
      uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : "", semSeguir: true,
      acoes: [{ rotulo: "Denunciar", classe: "perigo", fn: () => denunciar(p) }],
      aoClicar: () => denunciar(p)
    })) : [el("div", "lista-vazia", "Ninguém encontrado. Tente o @usuário.")]));
  }, 300);
});
function denunciar(p) {
  fecharFolha("folhaDenunciar");
  abrirDenuncia({ fb, eu, tipo: "perfil", alvoId: p.uid, itemId: p.uid, nomeAlvo: p.nome || "este perfil" });
}

// Aviso da equipe: abre o texto inteiro e marca como lido.
function abrirAviso(a) {
  $("avTitulo").textContent = a.titulo || "Aviso da equipe";
  $("avData").textContent = `${a.tipo === "grave" ? "Aviso importante · " : a.tipo === "alerta" ? "Alerta · " : ""}${quando(a.em)}`;
  $("avTexto").textContent = a.texto || "";
  $("folhaAviso").dataset.tipo = a.tipo || "info";
  $("avResponder").onclick = () => {
    fecharFolha("folhaAviso");
    novoChamado({ categoria: a.tipo === "info" || !a.tipo ? "outro" : "contestacao", assunto: `Sobre o aviso: ${a.titulo || "aviso da equipe"}`.slice(0, 120) });
  };
  abrirFolha("folhaAviso");
  if (a.lidoEm == null) {
    a.lidoEm = { toMillis: () => Date.now() };
    fb.updateDoc(fb.doc(fb.db, "avisos", a.id), { lidoEm: fb.serverTimestamp() }).then(carregar).catch((e) => console.warn("[Suporte] Aviso não marcado como lido:", e?.code || e));
  }
}

(async function iniciar() {
  pintarCats();
  try { await iniciarRede(); } catch (e) { toast(e.message || "Não foi possível carregar."); return; }
  montarBarraRede(""); pintarBarraRede();
  lidos = dados.suporteLido || {};
  const q = new URLSearchParams(location.search);
  const cat = q.get("categoria");
  const qAssunto = q.get("assunto") || "", qTexto = q.get("texto") || "";
  if ((cat && CAT[cat]) || qAssunto || qTexto) novoChamado({ categoria: CAT[cat] ? cat : undefined, assunto: qAssunto || (cat === "contestacao" ? "Contestar suspensão ou banimento" : ""), texto: qTexto });
  await carregar();
  // Veio de uma notificação: abre direto o chamado ou o aviso.
  const idCh = q.get("chamado"), idAv = q.get("aviso");
  if (idCh) {
    let c = chamados.find((x) => x.id === idCh);
    if (!c) { const s = await fb.getDoc(fb.doc(fb.db, "suporte", idCh)).catch(() => null); if (s?.exists()) c = { id: s.id, ...s.data() }; }
    if (c) abrir(c); else toast("Esse chamado não foi encontrado.");
  } else if (idAv) {
    let a = avisos.find((x) => x.id === idAv);
    if (!a) { const s = await fb.getDoc(fb.doc(fb.db, "avisos", idAv)).catch(() => null); if (s?.exists()) a = { id: s.id, ...s.data() }; }
    if (a) abrirAviso(a); else toast("Esse aviso não foi encontrado.");
  }
})();
