// =====================================================
// Ajuda e suporte (suporte.html): chamados da pessoa com a equipe.
// suporte/{id} + suporte/{id}/mensagens. Quem está suspenso também consegue
// abrir chamado (para contestar). A equipe responde pelo painel e também pode abrir
// uma conversa com a pessoa: tudo aparece como "Suporte Help Floripa" (conta oficial).
// Avisos da equipe (avisos/{id}) ficam no topo; ?aviso=ID abre um aviso e ?chamado=ID um chamado
// (links das notificações). Abrir marca como lido (avisos.lidoEm / usuarios.suporteLido).
// =====================================================
import { $, el, toast, erroAmigavel, abrirFolha, fecharFolha, fb, eu, dados, iniciarRede, montarBarraRede, pintarBarraRede } from "./rede.js?v=39";
import { SUPORTE, seloOficial, fotoSuporte, marcarChamadoLido } from "./avisos-equipe.js?v=1";

const CAT = { conta: "Conta", negocio: "Negócio", golpe: "Golpe", denuncia: "Denúncia", contestacao: "Contestação", pagamento: "Pagamento", sugestao: "Sugestão", outro: "Outro" };
const ST = { aberto: "Esperando a equipe", respondido: "A equipe respondeu", fechado: "Encerrado" };
const ms = (t) => t?.toMillis?.() ?? 0;
const quando = (t) => (ms(t) ? new Date(ms(t)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
let chamados = [], avisos = [], atual = null;
let lidos = {};
const novaResposta = (c) => c.status === "respondido" && c.ultimaDe === "equipe" && ms(c.atualizadoEm) > ms(lidos[c.id]);

// Nome do suporte com o selo de conta oficial.
function nomeOficial(tag = "strong") { const n = el(tag, "sup-oficial-nome", SUPORTE.nome); n.appendChild(seloOficial()); return n; }

async function carregar() {
  const [s, sa] = await Promise.all([
    fb.getDocs(fb.query(fb.collection(fb.db, "suporte"), fb.where("uid", "==", eu.uid), fb.limit(50))).catch(() => ({ docs: [] })),
    fb.getDocs(fb.query(fb.collection(fb.db, "avisos"), fb.where("uid", "==", eu.uid), fb.limit(30))).catch(() => ({ docs: [] }))
  ]);
  chamados = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
  avisos = sa.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).sort((a, b) => ms(b.em) - ms(a.em));
  const lista = $("supLista");
  $("supCarregando").hidden = true; lista.hidden = false;
  lista.replaceChildren();
  if (avisos.length) {
    lista.appendChild(el("h2", "sup-secao", "Avisos da equipe"));
    avisos.slice(0, 10).forEach((a) => {
      const b = el("button", "sup-item sup-aviso" + (a.lidoEm == null ? " novo" : "") + (a.tipo === "grave" ? " grave" : a.tipo === "alerta" ? " alerta" : "")); b.type = "button";
      const l1 = el("div", "l1"); l1.append(nomeOficial("span"));
      if (a.lidoEm == null) l1.appendChild(el("span", "sup-st novo", "Novo"));
      l1.appendChild(el("small", null, quando(a.em)));
      b.append(l1, el("strong", null, a.titulo || "Aviso"));
      if (a.texto) b.appendChild(el("span", "sup-trecho", a.texto));
      b.addEventListener("click", () => abrirAviso(a));
      lista.appendChild(b);
    });
    lista.appendChild(el("h2", "sup-secao", "Seus chamados"));
  }
  if (!chamados.length) { lista.appendChild(el("div", "lista-vazia", "Você ainda não abriu nenhum chamado.")); return; }
  chamados.forEach((c) => {
    const nova = novaResposta(c);
    const b = el("button", "sup-item" + (nova ? " novo" : "")); b.type = "button";
    const l1 = el("div", "l1");
    l1.append(el("span", "sup-st " + (nova ? "novo" : c.status), nova ? "Nova resposta" : ST[c.status] || c.status), el("small", null, `${c.abertoPor ? "Aberto pelo suporte" : CAT[c.categoria] || c.categoria} · ${quando(c.atualizadoEm)}`));
    b.append(l1, el("strong", null, c.assunto));
    b.addEventListener("click", () => abrir(c));
    lista.appendChild(b);
  });
}

async function abrir(c) {
  atual = c;
  $("tChamado").textContent = c.assunto;
  $("chMeta").textContent = `${c.abertoPor ? "Conversa aberta pelo suporte" : CAT[c.categoria] || c.categoria} · ${quando(c.criadoEm)} · ${ST[c.status] || c.status}`;
  $("chFechar").textContent = c.status === "fechado" ? "Reabrir chamado" : "Encerrar chamado";
  const box = $("chMsgs"); box.replaceChildren(el("div", "lista-vazia", "Carregando..."));
  abrirFolha("folhaChamado");
  if (novaResposta(c) || c.ultimaDe === "equipe") { lidos = { ...lidos, [c.id]: { toMillis: () => Date.now() } }; marcarChamadoLido(fb, fb.db, eu.uid, c.id); }
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "suporte", c.id, "mensagens"), fb.orderBy("em", "asc"))).catch(() => ({ docs: [] }));
  box.replaceChildren(...s.docs.map((d) => {
    const m = d.data({ serverTimestamps: "estimate" });
    if (!m.equipe) { const b = el("div", "sup-msg meu", m.texto); b.appendChild(el("small", null, `Você · ${quando(m.em)}`)); return b; }
    const linha = el("div", "sup-linha-equipe");
    const av = el("span", "sup-av"); av.appendChild(fotoSuporte());
    const b = el("div", "sup-msg equipe");
    b.append(nomeOficial("b"), el("div", null, m.texto), el("small", null, quando(m.em)));
    linha.append(av, b);
    return linha;
  }));
  carregar();
}

// Aviso da equipe: abre o texto inteiro e marca como lido.
function abrirAviso(a) {
  $("avTitulo").textContent = a.titulo || "Aviso da equipe";
  $("avData").textContent = `${a.tipo === "grave" ? "Aviso importante · " : a.tipo === "alerta" ? "Alerta · " : ""}${quando(a.em)}`;
  $("avTexto").textContent = a.texto || "";
  $("folhaAviso").dataset.tipo = a.tipo || "info";
  $("avResponder").onclick = () => {
    fecharFolha("folhaAviso");
    $("supCategoria").value = a.tipo === "info" ? "outro" : "contestacao";
    $("supAssunto").value = `Sobre o aviso: ${a.titulo || "aviso da equipe"}`.slice(0, 120);
    abrirFolha("folhaNovo");
  };
  abrirFolha("folhaAviso");
  if (a.lidoEm == null) {
    a.lidoEm = { toMillis: () => Date.now() };
    fb.updateDoc(fb.doc(fb.db, "avisos", a.id), { lidoEm: fb.serverTimestamp() }).then(carregar).catch((e) => console.warn("[Suporte] Aviso não marcado como lido:", e?.code || e));
  }
}

$("btnNovo").addEventListener("click", () => abrirFolha("folhaNovo"));
$("supTexto").addEventListener("input", () => { $("supCont").textContent = `${$("supTexto").value.length}/2000`; });
$("supEnviar").addEventListener("click", async () => {
  const assunto = $("supAssunto").value.trim(), texto = $("supTexto").value.trim(), categoria = $("supCategoria").value;
  if (assunto.length < 3) { toast("Escreva um resumo do assunto."); $("supAssunto").focus(); return; }
  if (texto.length < 10) { toast("Conte um pouco mais (mínimo de 10 caracteres)."); $("supTexto").focus(); return; }
  const b = $("supEnviar"); b.disabled = true;
  try {
    // Chamado e primeira mensagem vão juntos: se algo falhar, nada fica pela metade.
    const ref = fb.doc(fb.collection(fb.db, "suporte"));
    const lote = fb.writeBatch(fb.db);
    lote.set(ref, { uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), assunto, categoria, status: "aberto", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    lote.set(fb.doc(fb.db, "suporte", ref.id, "mensagens", "inicio"), { autorId: eu.uid, equipe: false, texto, em: fb.serverTimestamp() });
    await lote.commit();
    fecharFolha("folhaNovo");
    $("supAssunto").value = ""; $("supTexto").value = "";
    toast("Chamado enviado. A equipe responde por aqui e você recebe um aviso.");
    await carregar();
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
});
$("chEnviar").addEventListener("click", async () => {
  const texto = $("chTexto").value.trim();
  if (!texto || !atual) return;
  const b = $("chEnviar"); b.disabled = true;
  try {
    await fb.addDoc(fb.collection(fb.db, "suporte", atual.id, "mensagens"), { autorId: eu.uid, equipe: false, texto, em: fb.serverTimestamp() });
    await fb.updateDoc(fb.doc(fb.db, "suporte", atual.id), { status: "aberto", atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    $("chTexto").value = ""; atual.status = "aberto";
    await abrir(atual); carregar();
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
});
$("chFechar").addEventListener("click", async () => {
  if (!atual) return;
  const novo = atual.status === "fechado" ? "aberto" : "fechado";
  try {
    await fb.updateDoc(fb.doc(fb.db, "suporte", atual.id), { status: novo, atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    atual.status = novo; fecharFolha("folhaChamado"); toast(novo === "fechado" ? "Chamado encerrado" : "Chamado reaberto"); carregar();
  } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
});

(async function iniciar() {
  try { await iniciarRede(); } catch (e) { toast(e.message || "Não foi possível carregar."); return; }
  montarBarraRede(""); pintarBarraRede();
  lidos = dados.suporteLido || {};
  const q = new URLSearchParams(location.search);
  const cat = q.get("categoria");
  if (cat && CAT[cat]) { $("supCategoria").value = cat; if (cat === "contestacao") $("supAssunto").value = "Contestar suspensão ou banimento"; abrirFolha("folhaNovo"); }
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
